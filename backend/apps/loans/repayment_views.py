"""
Loan repayment collection — completes the loan lifecycle
(request → approve → disburse → REPAY → repaid).

Mirrors the proven contribution money-in flow:
  initiate (STK push, server-computed amount) → provider webhook →
  select_for_update + idempotent status guard → fail-closed amount
  mismatch (suspense + reconciliation item) → balanced ledger event group
  (debit provider_settlement / credit loaning) → installment marked paid →
  loan transitions to 'repaid' when the last installment settles.

The loan pool earns the interest: group-internal lending means both
principal and interest return to the group's loaning stream.
"""
import uuid
from decimal import Decimal, ROUND_HALF_UP

import structlog
from django.db import transaction
from django.utils import timezone as tz
from rest_framework import status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.ledger.services import (
    append_ledger_entry,
    close_ledger_event_group,
    record_reconciliation_exception,
)
from apps.loans.models import Loan, LoanRepayment, LoanRepaymentPayment
from apps.payments.selector import get_payment_provider
from common.db_utils import get_db_for_country, get_db_for_group
from common.exceptions import success_response

logger = structlog.get_logger(__name__)


class InitiateRepaymentView(views.APIView):
    """
    POST /api/v1/loans/<loan_pk>/repayments/<repayment_pk>/pay/

    The amount is ALWAYS the outstanding remainder of the installment,
    computed server-side — the client cannot choose what to pay.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, loan_pk, repayment_pk):
        if not request.user.phone_verified:
            return Response(
                {'error': 'Verify your phone number before making repayments.',
                 'code': 'phone_unverified'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Production rows live on the user's country DB; dev/test rows land on
        # default — same two-alias convention as membership_policy.
        repayment = None
        db_alias = 'default'
        for candidate in {get_db_for_country(getattr(request.user, 'country', None)), 'default'}:
            repayment = (
                LoanRepayment.objects.using(candidate)
                .select_related('loan', 'loan__group')
                .filter(id=repayment_pk, loan_id=loan_pk)
                .first()
            )
            if repayment is not None:
                db_alias = candidate
                break
        if repayment is None:
            return Response({'error': 'Repayment installment not found.'}, status=status.HTTP_404_NOT_FOUND)

        loan = repayment.loan
        if loan.borrower_id != request.user.id:
            return Response(
                {'error': 'Only the borrower can repay their own loan.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if loan.status not in ('disbursed', 'active'):
            return Response(
                {'error': f"Loan is '{loan.status}' — repayments apply to disbursed loans only."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if repayment.status in ('paid', 'waived'):
            return Response(
                {'error': f'This installment is already {repayment.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        outstanding = (repayment.total_due - repayment.amount_paid).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        if outstanding <= Decimal('0.00'):
            return Response({'error': 'Nothing outstanding on this installment.'}, status=status.HTTP_400_BAD_REQUEST)

        phone = str(request.data.get('phone') or request.user.mobile_money_number or request.user.phone)

        with transaction.atomic(using=db_alias):
            pending_exists = (
                LoanRepaymentPayment.objects.using(db_alias)
                .filter(repayment=repayment, status='initiated')
                .exists()
            )
            if pending_exists:
                return Response(
                    {'error': 'A repayment for this installment is already awaiting settlement.'},
                    status=status.HTTP_409_CONFLICT,
                )

            provider = get_payment_provider(country=loan.group.country)
            res = provider.initiate_collection(
                phone=phone,
                amount=outstanding,
                reference=f"LNR-{repayment.id}",
                description=f"Loan repayment — {loan.group.name}",
            )
            if res.get('status') == 'failed':
                return Response(
                    {'error': 'The payment provider rejected the repayment request.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            prov_ref = res.get('provider_reference', 'UNKNOWN')
            payment = LoanRepaymentPayment.objects.using(db_alias).create(
                repayment=repayment,
                loan=loan,
                group=loan.group,
                member=request.user,
                amount=outstanding,
                currency=loan.group.currency,
                mobile_number=phone,
                status='initiated',
                initiated_at=tz.now(),
                provider_reference=prov_ref,
                platform_reference=f"LRP-{uuid.uuid4().hex[:12].upper()}",
            )

        logger.info(
            'loan_repayment_initiated',
            loan_id=str(loan.id), repayment_id=str(repayment.id),
            amount=str(outstanding), provider_ref=prov_ref,
        )
        return success_response(
            data={'provider_reference': prov_ref, 'amount': str(outstanding), 'status': 'pending_async'},
            message='Repayment request sent to your phone. Approve the prompt to complete it.',
            status_code=201,
        )


class RepaymentWebhookView(views.APIView):
    """
    POST /api/v1/loans/webhook/<country>/<provider_id>/
    Provider settlement callback for loan repayments — idempotent, fail-closed.
    """
    permission_classes = [AllowAny]

    def post(self, request, country, provider_id):
        provider = get_payment_provider(country=country, method=provider_id)

        if not provider.verify_webhook_signature(request):
            logger.warning('repayment_webhook_signature_forged', ip=request.META.get('REMOTE_ADDR'))
            return Response({'error': 'Signature validation failed.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            parsed = provider.parse_callback(request.data)
            if hasattr(provider, 'record_callback'):
                provider.record_callback(request.data, parsed)
        except Exception as exc:
            logger.error('repayment_webhook_parser_failed', error=str(exc))
            return Response({'error': 'Malformed provider payload.'}, status=status.HTTP_400_BAD_REQUEST)

        prov_ref = parsed.get('transaction_id')
        cb_status = parsed.get('status')

        # Locate the payment intent (country DB in production, default in
        # dev/tests — same two-alias convention as membership_policy).
        db_alias = 'default'
        for candidate in {get_db_for_country(country), 'default'}:
            if LoanRepaymentPayment.objects.using(candidate).filter(provider_reference=prov_ref).exists():
                db_alias = candidate
                break

        with transaction.atomic(using=db_alias):
            try:
                payment = (
                    LoanRepaymentPayment.objects.using(db_alias)
                    .select_for_update()
                    .select_related('repayment', 'loan', 'group')
                    .get(provider_reference=prov_ref)
                )
            except LoanRepaymentPayment.DoesNotExist:
                logger.error('repayment_webhook_orphan_reference', reference=prov_ref)
                return Response({'status': 'acknowledged'}, status=status.HTTP_200_OK)

            if payment.status != 'initiated':
                return Response({'status': 'acknowledged'}, status=status.HTTP_200_OK)

            if cb_status == 'failed':
                payment.status = 'failed'
                payment.failure_reason = parsed.get('reason', 'Provider reported failure.')
                payment.save(using=db_alias, update_fields=['status', 'failure_reason', 'updated_at'])
                return Response({'status': 'acknowledged'}, status=status.HTTP_200_OK)

            observed = Decimal(str(parsed.get('amount', payment.amount))).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            if observed != payment.amount:
                # Fail closed: money observed but not what we asked for —
                # isolate to suspense; a human resolves via reconciliation.
                payment.status = 'disputed'
                payment.actual_amount = observed
                payment.save(using=db_alias, update_fields=['status', 'actual_amount', 'updated_at'])
                record_reconciliation_exception(
                    country=country,
                    account_stream='loaning',
                    issue_type='amount_mismatch',
                    reference=str(prov_ref),
                    expected_amount=payment.amount,
                    observed_amount=observed,
                    currency=payment.currency,
                    group=payment.group,
                    provider_reference=str(prov_ref),
                    severity='red',
                    details={'flow': 'loan_repayment', 'payment_id': str(payment.id)},
                    isolate_to_suspense=True,
                    member=payment.member,
                    db_alias=db_alias,
                )
                logger.warning(
                    'repayment_webhook_amount_mismatch_frozen',
                    payment_id=str(payment.id), expected=str(payment.amount), observed=str(observed),
                )
                return Response({'status': 'acknowledged', 'review': 'required'}, status=status.HTTP_200_OK)

            # Success: settle the installment and post the balanced event group.
            payment.status = 'confirmed'
            payment.confirmed_at = tz.now()
            payment.actual_amount = observed
            payment.save(using=db_alias, update_fields=['status', 'confirmed_at', 'actual_amount', 'updated_at'])

            repayment = payment.repayment
            repayment.amount_paid = (repayment.amount_paid + observed).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            update_fields = ['amount_paid', 'updated_at']
            if repayment.amount_paid >= repayment.total_due:
                repayment.status = 'paid'
                repayment.paid_at = tz.now()
                repayment.payment_reference = str(prov_ref)
                update_fields += ['status', 'paid_at', 'payment_reference']
            repayment.save(using=db_alias, update_fields=update_fields)

            event_group_key = f"loan_repayment:{prov_ref}:settled"
            append_ledger_entry(
                group=payment.group,
                member=payment.member,
                account_stream='provider_settlement',
                entry_type='loan_repayment',
                direction='debit',
                amount=observed,
                currency=payment.currency,
                description=f"Provider cash settlement for loan repayment via {provider_id.upper()}",
                reference=f"{prov_ref}:provider_settlement",
                related_loan=payment.loan,
                idempotency_key=f"loan_repayment:webhook:{prov_ref}:provider_settlement",
                source_system='provider_webhook',
                event_group_key=event_group_key,
                event_type='loan_repayment_settled',
            )
            append_ledger_entry(
                group=payment.group,
                member=payment.member,
                account_stream='loaning',
                entry_type='loan_repayment',
                direction='credit',
                amount=observed,
                currency=payment.currency,
                description='Loan repayment returned to the loan pool (principal + interest)',
                reference=f"{prov_ref}:loaning",
                related_loan=payment.loan,
                idempotency_key=f"loan_repayment:webhook:{prov_ref}:loaning",
                source_system='provider_webhook',
                event_group_key=event_group_key,
                event_type='loan_repayment_settled',
            )
            close_ledger_event_group(event_group_key, db_alias=db_alias)

            # Loan closes when every installment is settled (or waived).
            loan = payment.loan
            has_open_installments = (
                LoanRepayment.objects.using(db_alias)
                .filter(loan=loan)
                .exclude(status__in=['paid', 'waived'])
                .exists()
            )
            if not has_open_installments and loan.status != 'repaid':
                loan.status = 'repaid'
                loan.fully_repaid_at = tz.now()
                loan.save(using=db_alias, update_fields=['status', 'fully_repaid_at'])
                logger.info('loan_fully_repaid', loan_id=str(loan.id))

            logger.info(
                'repayment_webhook_settled',
                payment_id=str(payment.id), amount=str(observed),
                loan_status=loan.status,
            )

        return Response({'status': 'acknowledged'}, status=status.HTTP_200_OK)

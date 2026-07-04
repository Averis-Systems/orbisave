import hashlib
import uuid
import structlog
from django.utils import timezone as tz
from rest_framework import views, status, viewsets, mixins
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction, models, connections
from django.db.models import F
from decimal import Decimal, ROUND_HALF_UP

from contextlib import contextmanager
from threading import Lock
from rest_framework.decorators import action
from .models import Contribution, Penalty
from .serializers import ContributionInitiateSerializer, ContributionStatusSerializer, PenaltySerializer
from apps.groups.models import GroupMember, Group, RotationCycle, PenaltyRule
from apps.ledger.services import append_ledger_entry, close_ledger_event_group
from apps.payments.selector import get_payment_provider
from common.exceptions import success_response
from common.db_utils import get_db_for_group, get_db_for_country
from common.permissions import IsGroupMember, IsGroupLeader
from .services.provider_exceptions import freeze_contribution_amount_mismatch

_sqlite_lock = Lock()

logger = structlog.get_logger(__name__)

@contextmanager
def advisory_lock(lock_id: int):
    """
    Acquires a Postgres session-level transaction lock or a threading.Lock fallback for SQLite.
    Satisfies Financial Engine Checklist Item 11: Concurrency.
    """
    from django.db import connection
    if connection.vendor == 'sqlite':
        with _sqlite_lock:
            yield
    else:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_id])
            yield

@contextmanager
def sqlite_write_lock(db_alias: str):
    """
    Serializes local SQLite write-heavy tests while preserving database-native
    row locking for production engines.
    """
    if connections[db_alias].vendor == 'sqlite':
        with _sqlite_lock:
            yield
    else:
        yield

class PenaltyViewSet(viewsets.ModelViewSet):
    """
    Controller for member penalties (fines).
    """
    serializer_class = PenaltySerializer
    permission_classes = [IsAuthenticated, IsGroupMember]

    def get_queryset(self):
        user = self.request.user
        group_id = self.request.query_params.get('group')

        # Penalties for any group the user is a member of
        queryset = Penalty.objects.filter(
            rule__group__memberships__member=user,
            rule__group__memberships__status='active'
        ).distinct().select_related('rule').order_by('-created_at')

        if group_id:
            queryset = queryset.filter(rule__group_id=group_id)

        return queryset

    @action(detail=False, methods=['post'], permission_classes=[IsGroupLeader])
    def issue(self, request):
        """
        Manually issue a fine to a member.
        """
        member_id = request.data.get('member')
        amount = request.data.get('amount')
        rule_type = request.data.get('rule_type', 'late_contribution')
        group_id = request.data.get('group')

        if not all([member_id, amount, group_id]):
            return Response({"error": "Member, amount, and group are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            group = Group.objects.get(id=group_id)
            # Find or create a generic rule for this type if needed
            rule, _ = PenaltyRule.objects.get_or_create(
                group=group,
                rule_type=rule_type,
                defaults={'penalty_type': 'fixed', 'value': amount}
            )

            from apps.accounts.models import User
            member = User.objects.get(id=member_id)

            penalty = Penalty.objects.create(
                member=member,
                rule=rule,
                amount=amount,
                status='pending'
            )

            return success_response(data=PenaltySerializer(penalty).data, message="Fine issued successfully.")
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ContributionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Controller for member contributions.
    Provides visibility into contribution history and status.
    """
    serializer_class = ContributionStatusSerializer
    permission_classes = [IsAuthenticated, IsGroupMember]

    def get_queryset(self):
        user = self.request.user
        group_id = self.request.query_params.get('group')

        queryset = Contribution.objects.filter(
            group__memberships__member=user,
            group__memberships__status='active'
        ).select_related('group').order_by('-created_at')

        if group_id:
            queryset = queryset.filter(group_id=group_id)

        return queryset

class InitiateContributionView(views.APIView):
# ...
    permission_classes = [IsAuthenticated]

    def post(self, request, group_pk):
        """
        Idempotent endpoint. Validates input via serializer then initiates a
        state machine transition to 'initiated'.
        Satisfies System Checklist Section 6 (Input Validation) + Financial Engine Checklist 1 & 4.
        """
        # ── Serializer Validation ──────────────────────────────────────────
        serializer = ContributionInitiateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount_dec = serializer.validated_data['amount']
        phone      = serializer.validated_data['phone']
        method     = serializer.validated_data['method']

        # Money movement requires a verified phone: the STK push targets the
        # member's number, and an unverified number is an unowned number.
        if not request.user.phone_verified:
            return Response(
                {
                    'error': 'Verify your phone number before making contributions.',
                    'code': 'phone_unverified',
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        membership_db_alias = get_db_for_country(getattr(request.user, 'country', None))
        try:
            membership = GroupMember.objects.using(membership_db_alias).select_related('group').get(
                group_id=group_pk,
                member=request.user,
                status__in=['active', 'pending_approval', 'pending_session_refresh']
            )
        except GroupMember.DoesNotExist:
            return Response(
                {"error": "You do not have a contribution-eligible membership in this group."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Mandatory Next of Kin check for financial engine participation
        if not request.user.next_of_kin_name or not request.user.next_of_kin_phone:
            return Response(
                {"error": "Next of Kin information (name and phone) is mandatory before contributing to any group pool."},
                status=status.HTTP_403_FORBIDDEN
            )

        group = membership.group
        from apps.groups.lifecycle import mandatory_activation_amount, pending_membership_expired

        if membership.status != 'active':
            threshold = mandatory_activation_amount(group)
            if membership.role == 'chairperson':
                if (
                    request.user.kyc_status != 'verified'
                    or group.verification_status != 'verified'
                    or group.status != 'pending_activation'
                    or amount_dec < threshold
                ):
                    return Response(
                        {"error": "Chairperson KYC approval and the first mandatory contribution are required before group activation."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            elif membership.role == 'member':
                if group.status != 'active':
                    return Response({"error": "This group is not active for member contributions yet."}, status=status.HTTP_403_FORBIDDEN)
                if pending_membership_expired(membership):
                    membership.status = 'exited'
                    membership.exited_at = tz.now()
                    membership.save(update_fields=['status', 'exited_at'])
                    return Response({"error": "Membership activation grace period expired. Request a fresh invite."}, status=status.HTTP_403_FORBIDDEN)
                if amount_dec < threshold:
                    return Response(
                        {"error": f"Mandatory activation contribution must be at least {threshold} {group.currency}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        db_alias = get_db_for_group(group)

        lock_seed = int(hashlib.blake2s(
            f"init_contrib_{request.user.id}_{group.id}".encode()
        ).hexdigest(), 16) % (2**63 - 1)

        with transaction.atomic(using=db_alias):
            with advisory_lock(lock_seed):
                # Anti-Spam: Check if a highly identical pending contribution already explicitly exists
                existing_pending = Contribution.objects.using(db_alias).filter(
                    group=group, 
                    member=request.user, 
                    amount=amount_dec, 
                    status='initiated'
                ).exists()
                
                if existing_pending:
                     return Response({"error": "An identical structurally pending contribution is already actively awaiting settlement via payment provider."}, status=status.HTTP_409_CONFLICT)

                # Fire the abstract Telecom interface
                provider = get_payment_provider(country=group.country, method=method)
                res = provider.initiate_collection(
                    phone=phone,
                    amount=amount_dec,
                    reference=f"GRP-{group.id}",
                    description=f"Contribution to {group.name}"
                )
                
                if res.get('status') == 'failed':
                     return Response({"error": "Target Payment Provider implicitly rejected the request configuration."}, status=status.HTTP_502_BAD_GATEWAY)

                prov_ref = res.get('provider_reference', 'UNKNOWN')

                # State formally tracking
                current_cycle = RotationCycle.objects.using(db_alias).filter(group=group, is_current=True).first()
                contribution = Contribution.objects.using(db_alias).create(
                    group=group,
                    member=request.user,
                    amount=amount_dec,
                    currency=group.currency,
                    method=method,
                    mobile_number=phone,
                    status='initiated',
                    initiated_at=tz.now(),
                    provider_reference=prov_ref,
                    platform_reference=f"PLT-{uuid.uuid4().hex[:12].upper()}",
                    scheduled_date=tz.now().date(),
                    cycle=current_cycle
                )

                logger.info("contribution_initiated", user_id=request.user.id, amount=amount_dec, provider_ref=prov_ref)
            
        return success_response(data={"provider_reference": prov_ref, "status": "pending_async"}, message="Contribution heavily successfully pushed to execution stack.", status_code=201)


class ContributionWebhookView(views.APIView):
    """
    Publicly facing webhook explicitly structured to act as the core State Engine transition controller.
    Satisfies Financial Engine Checklist 1. Event Driven & 12. Data Integrity.
    """
    permission_classes = [AllowAny] 
    
    def post(self, request, country, provider_id):
        provider = get_payment_provider(country=country, method=provider_id)
        
        if not provider.verify_webhook_signature(request):
            logger.warning("webhook_signature_forged", ip=request.META.get('REMOTE_ADDR'), provider=provider_id)
            return Response({"error": "Cryptographic signature validation completely failed."}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
             parsed = provider.parse_callback(request.data)
             if hasattr(provider, 'record_callback'):
                 provider.record_callback(request.data, parsed)
        except Exception as e:
             logger.error("webhook_parser_failed", error=str(e), payload=request.data)
             return Response({"error": "Malformed provider payload array."}, status=status.HTTP_400_BAD_REQUEST)
             
        prov_ref = parsed.get("transaction_id")
        cb_status = parsed.get("status")
        
        db_alias = get_db_for_country(country)
        with sqlite_write_lock(db_alias):
            with transaction.atomic(using=db_alias):  # Safe multi-DB routing
                # Select FOR UPDATE mechanically freezes the row locking out thousands of concurrent pings immediately.
                try:
                    contrib = (
                        Contribution.objects.using(db_alias)
                        .select_for_update()
                        .select_related('group')
                        .get(provider_reference=prov_ref)
                    )
                except Contribution.DoesNotExist:
                    logger.error("webhook_orphan_reference", reference=prov_ref)
                    return Response({"status": "acknowledged"}, status=status.HTTP_200_OK) # Acknowledge anyway so provider doesn't DDOS retry

                if contrib.status not in ['initiated', 'pending']:
                    # Idempotency achieved! This webhook already executed or failed permanently.
                    return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)

                if cb_status == 'failed':
                    contrib.status = 'failed'
                    contrib.save(update_fields=['status'])
                    logger.info("contribution_webhook_failed_marked", contrib_id=contrib.id)
                    return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)

                observed_amount = Decimal(parsed.get('amount', contrib.amount))
                if observed_amount != contrib.amount:
                    freeze_contribution_amount_mismatch(
                        contribution=contrib,
                        country=country,
                        provider_id=provider_id,
                        observed_amount=observed_amount,
                        raw_payload=parsed.get('raw', request.data),
                    )
                    logger.warning(
                        "contribution_webhook_amount_mismatch_frozen",
                        contrib_id=contrib.id,
                        expected=str(contrib.amount),
                        observed=str(observed_amount),
                    )
                    return Response({"status": "acknowledged", "review": "required"}, status=status.HTTP_200_OK)

                # Success Track! Shift to double-entry ledger instantiation.
                contrib.status = 'confirmed'
                contrib.confirmed_at = tz.now()
                contrib.actual_amount = observed_amount
                contrib.save(using=db_alias, update_fields=['status', 'confirmed_at', 'actual_amount'])

                # Formally calculate and bind any statutory late penalties defining this specific transaction sequence.
                from .services.penalty_service import PenaltyService
                PenaltyService.apply_late_penalty(contrib)

                # Increment cycle aggregates for live tracking
                if contrib.cycle:
                    from django.db.models import F
                    contrib.cycle.total_contributions = F('total_contributions') + contrib.actual_amount
                    contrib.cycle.save(using=db_alias, update_fields=['total_contributions'])

                # Double-entry stream allocation enforced instantly.
                # Mandatory savings is deducted first, then the remaining amount is
                # split between rotation savings and loaning by group settings.
                actual_amount = Decimal(str(contrib.actual_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                savings_amount = min(
                    actual_amount,
                    Decimal(str(contrib.group.mandatory_savings_amount or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                )
                distributable_amount = actual_amount - savings_amount
                loan_pct = Decimal(str(contrib.group.loan_pool_pct or 0))
                loaning_amount = ((distributable_amount * loan_pct) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                rotation_amount = distributable_amount - loaning_amount

                ledger_allocations = [
                    ('savings', savings_amount, 'Mandatory savings allocation'),
                    ('loaning', loaning_amount, 'Loan pool allocation'),
                    ('rotation', rotation_amount, 'Rotation savings allocation'),
                ]
                event_group_key = f"contribution:{prov_ref}:settled"
                append_ledger_entry(
                    group=contrib.group,
                    member=contrib.member,
                    account_stream='provider_settlement',
                    entry_type='contribution',
                    direction='debit',
                    amount=actual_amount,
                    currency=contrib.group.currency,
                    description=f"Provider cash settlement via {provider_id.upper()}",
                    reference=f"{prov_ref}:provider_settlement",
                    related_contribution=contrib,
                    idempotency_key=f"contribution:webhook:{prov_ref}:provider_settlement",
                    source_system='provider_webhook',
                    event_group_key=event_group_key,
                    event_type='provider_collection_settled',
                )
                for account_stream, amount, description in ledger_allocations:
                    if amount <= 0:
                        continue
                    append_ledger_entry(
                        group=contrib.group,
                        member=contrib.member,
                        account_stream=account_stream,
                        entry_type='contribution',
                        direction='credit',
                        amount=amount,
                        currency=contrib.group.currency,
                        description=f"{description} via {provider_id.upper()}",
                        reference=f"{prov_ref}:{account_stream}",
                        related_contribution=contrib,
                        idempotency_key=f"contribution:webhook:{prov_ref}:{account_stream}",
                        source_system='provider_webhook',
                        event_group_key=event_group_key,
                        event_type='provider_collection_settled',
                    )
                close_ledger_event_group(event_group_key, db_alias=db_alias)

                logger.info("contribution_webhook_success_locked", contrib_id=contrib.id, amount=contrib.actual_amount)
            
        return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)

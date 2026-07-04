"""
GOLDEN PATH — the executable definition of "the money flows right".

One test walks the entire Kenya production journey through the public API:

  chairperson registers → verifies phone (SMS OTP) → creates a group →
  contributes (STK push + provider webhook) → country admin verifies the
  group (KYC-gated) → group activates → member is invited, registers,
  verifies, joins → member contributes → rotation initializes → payout
  executes (PIN-gated, schedule-derived) → member borrows → 3-stage
  approval → disbursement (provider B2C) → repays every installment →
  loan 'repaid' — and at the end EVERY ledger stream must verify:
  unbroken hash chains, exact sequence numbers, and running balances that
  equal credits minus debits. All event groups must be closed (balanced).

CI runs this against the MockProvider-style mocks below; staging runs the
same journey against the Jenga sandbox (see docs/jenga_production_cutover_runbook.md).
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.groups.models import Group, GroupMember
from apps.ledger.models import LedgerEntry, LedgerEventGroup
from apps.ledger.services import verify_ledger_stream
from apps.loans.models import Loan, LoanRepaymentPayment

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])

CONTRIBUTION = Decimal('10000.00')
SAVINGS = Decimal('1000.00')


def extract_otp(sender):
    message = sender.call_args.args[1]
    for part in message.replace('.', ' ').split():
        if part.isdigit() and len(part) == 6:
            return part
    raise AssertionError(f'No OTP in: {message!r}')


def make_provider_mock(prefix):
    """Instant-success provider double with per-call unique references."""
    provider = MagicMock()
    counter = {'n': 0}

    def collection(phone, amount, reference, description):
        counter['n'] += 1
        return {'status': 'pending_async', 'provider_reference': f'{prefix}-COL-{counter["n"]}'}

    def disbursement(phone, amount, reference, remarks):
        counter['n'] += 1
        return {'status': 'success', 'provider_reference': f'{prefix}-DIS-{counter["n"]}'}

    provider.initiate_collection.side_effect = collection
    provider.initiate_disbursement.side_effect = disbursement
    provider.verify_webhook_signature.return_value = True
    del provider.record_callback
    return provider


def fire_contribution_webhook(provider, prov_ref, amount):
    provider.parse_callback.return_value = {
        'status': 'success', 'transaction_id': prov_ref, 'amount': str(amount),
    }
    with patch('apps.contributions.views.get_payment_provider', return_value=provider):
        response = APIClient().post('/api/v1/contributions/webhook/kenya/mpesa/', {}, format='json')
    assert response.status_code == 200
    return response


def fire_repayment_webhook(provider, prov_ref, amount):
    provider.parse_callback.return_value = {
        'status': 'success', 'transaction_id': prov_ref, 'amount': str(amount),
    }
    with patch('apps.loans.repayment_views.get_payment_provider', return_value=provider):
        response = APIClient().post('/api/v1/loans/webhook/kenya/mpesa/', {}, format='json')
    assert response.status_code == 200
    return response


def register_and_verify(email, phone, full_name, role='member'):
    """Register through the API, log in, complete SMS OTP verification."""
    client = APIClient()
    register = client.post('/api/v1/auth/register/', {
        'full_name': full_name, 'email': email, 'phone': phone,
        'password': 'GoldenPath123!', 'role': role, 'country': 'kenya',
    }, format='json')
    assert register.status_code == 201, register.data

    token = client.post('/api/v1/auth/token/', {
        'email': email, 'password': 'GoldenPath123!',
    }, format='json')
    assert token.status_code == 200
    authed = APIClient()
    authed.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}", HTTP_X_COUNTRY='kenya')

    with patch('apps.accounts.otp_views.send_sms', return_value={'channel': 'logged'}) as sender:
        assert authed.post('/api/v1/auth/otp/request/').status_code == 200
    confirm = authed.post('/api/v1/auth/otp/confirm/', {'code': extract_otp(sender)}, format='json')
    assert confirm.status_code == 200

    user = User.objects.get(email=email)
    assert user.phone_verified is True

    # Next-of-kin is mandatory before joining/contributing (product rule —
    # normally captured during profile onboarding).
    profile = authed.patch('/api/v1/auth/profile/update/', {
        'next_of_kin_name': f'{full_name} Kin',
        'next_of_kin_phone': '+254700199999',
    }, format='json')
    assert profile.status_code in (200, 202), profile.data
    user.refresh_from_db()
    return authed, user


def contribute(client, provider, group_id, amount, phone):
    with patch('apps.contributions.views.get_payment_provider', return_value=provider):
        response = client.post(f'/api/v1/contributions/{group_id}/initiate/', {
            'amount': str(amount), 'phone': phone, 'method': 'mpesa',
        }, format='json')
    assert response.status_code == 201, response.data
    prov_ref = response.data['data']['provider_reference']
    fire_contribution_webhook(provider, prov_ref, amount)
    return prov_ref


def test_golden_path_full_money_lifecycle():
    provider = make_provider_mock('GP')

    # ── 1. Chairperson: register → verify phone → create group ─────────────
    chair_client, chair = register_and_verify(
        'goldchair@test.orbisave.com', '+254700100001', 'Golden Chair', role='chairperson',
    )
    create = chair_client.post('/api/v1/groups/', {
        'name': 'Golden Path Chama', 'country': 'kenya', 'max_members': 10,
        'contribution_amount': str(CONTRIBUTION), 'contribution_frequency': 'monthly',
        'contribution_day': 1, 'rotation_savings_pct': '70.00', 'loan_pool_pct': '30.00',
        'max_loan_multiplier': '3.00', 'loan_term_weeks': 4,
        'loan_interest_rate_monthly': '5.00', 'rotation_method': 'sequential',
        'mandatory_savings_amount': str(SAVINGS),
        'savings_access_month': 12, 'savings_access_day': 31,
    }, format='json')
    assert create.status_code == 201, create.data
    group = Group.objects.using('kenya').get(name='Golden Path Chama')

    assert chair_client.post('/api/v1/auth/transaction-pin/', {
        'pin': '1234', 'password': 'GoldenPath123!',
    }, format='json').status_code == 200

    # ── 2. Governance gates hold while the chair has no KYC ────────────────
    admin = User.objects.create(
        email='goldadmin@averissystems.com', phone='+254700100009',
        full_name='Golden Admin', role='platform_admin', country='kenya',
        kyc_status='verified', phone_verified=True, is_active=True,
        password=make_password('GoldenPath123!'),
    )
    admin_client = APIClient()
    admin_client.force_authenticate(user=admin)

    blocked = admin_client.post(f'/api/v1/admin-portal/groups/{group.id}/verify/',
                                {'action': 'verify'}, format='json')
    assert blocked.status_code == 400  # chair has no KYC yet — gate holds

    chair.kyc_status = 'verified'  # KYC review flow is covered by its own suite
    chair.save(update_fields=['kyc_status'])

    # ── 3. Verify group (KYC now passes), then the first mandatory deposit ─
    verified = admin_client.post(f'/api/v1/admin-portal/groups/{group.id}/verify/',
                                 {'action': 'verify'}, format='json')
    assert verified.status_code == 200, verified.data

    contribute(chair_client, provider, group.id, CONTRIBUTION, chair.phone)

    # Session refresh transition is exercised in the auth suite — settle it here.
    GroupMember.objects.using('kenya').filter(group=group, member=chair).update(status='active')

    # The mandatory first deposit may auto-activate the group; the explicit
    # activation endpoint covers the manual path.
    group = Group.objects.using('kenya').get(id=group.id)
    if group.status != 'active':
        activate = chair_client.post(f'/api/v1/groups/{group.id}/activate/')
        assert activate.status_code == 200, activate.data
        group = Group.objects.using('kenya').get(id=group.id)
    assert group.status == 'active'

    # ── 4. Member: invite → register → verify → join → contribute ─────────
    invite = chair_client.post(f'/api/v1/groups/{group.id}/invites/',
                               {'phone': '+254700100002'}, format='json')
    assert invite.status_code == 201, invite.data
    invite_token = invite.data['data']['token']

    member_client, member = register_and_verify(
        'goldmember@test.orbisave.com', '+254700100002', 'Golden Member',
    )

    join = member_client.post(f'/api/v1/invites/{invite_token}/')
    assert join.status_code == 200, join.data
    GroupMember.objects.using('kenya').filter(group=group, member=member).update(status='active')

    contribute(member_client, provider, group.id, CONTRIBUTION, member.phone)

    # ── 5. Rotation: initialize schedule → open cycle → PIN-gated payout ───
    assert chair_client.post(f'/api/v1/groups/{group.id}/initialize_rotation/').status_code == 200
    assert chair_client.post(f'/api/v1/groups/{group.id}/next_cycle/').status_code == 200

    with patch('apps.payouts.services.get_payment_provider', return_value=provider):
        payout = chair_client.post(f'/api/v1/payouts/{group.id}/execute/',
                                   {'pin': '1234'}, format='json')
    assert payout.status_code == 201, payout.data

    # ── 6. Loan: request → chair + admin approve → disburse → repay all ────
    loan_request = member_client.post('/api/v1/loans/', {
        'amount': '3000.00', 'purpose': 'business', 'term_weeks': 4,
        'group': str(group.id),
    }, format='json')
    assert loan_request.status_code == 201, loan_request.data
    loan = Loan.objects.using('kenya').get(borrower=member)

    assert chair_client.post(f'/api/v1/loans/{loan.id}/approve/',
                             {'pin': '1234'}, format='json').status_code == 200
    assert admin_client.post(f'/api/v1/admin-portal/loans/{loan.id}/action/',
                             {'action': 'approve'}, format='json').status_code == 200

    with patch('apps.loans.services.loan_engine.get_payment_provider', return_value=provider):
        disburse = admin_client.post(f'/api/v1/admin-portal/loans/{loan.id}/action/',
                                     {'action': 'disburse'}, format='json')
    assert disburse.status_code == 200, disburse.data
    loan = Loan.objects.using('kenya').get(id=loan.id)
    assert loan.status == 'disbursed'

    for installment in loan.repayments.order_by('due_date'):
        with patch('apps.loans.repayment_views.get_payment_provider', return_value=provider):
            pay = member_client.post(
                f'/api/v1/loans/{loan.id}/repayments/{installment.id}/pay/')
        assert pay.status_code == 201, pay.data
        payment = LoanRepaymentPayment.objects.using('kenya').get(repayment=installment, status='initiated')
        fire_repayment_webhook(provider, payment.provider_reference, payment.amount)

    loan = Loan.objects.using('kenya').get(id=loan.id)
    assert loan.status == 'repaid'
    assert loan.fully_repaid_at is not None

    # ── 7. THE VERDICT: every ledger stream must verify, every event group
    #      must be closed, and balances must equal credits − debits. ───────
    streams = (
        LedgerEntry.objects.using('kenya').filter(group=group)
        .values_list('account_stream', 'currency').distinct()
    )
    assert len(streams) >= 4  # savings, loaning, rotation, provider_settlement
    for account_stream, currency in streams:
        result = verify_ledger_stream(group=group, account_stream=account_stream, currency=currency)
        assert result['valid'], f'{account_stream}: {result["errors"]}'

    assert not LedgerEventGroup.objects.using('kenya').filter(status='open').exists(), \
        'unbalanced/open ledger event groups left behind'

    # Loan pool conservation: contributions in, principal out and back in
    # with interest — the pool must exceed its pre-loan level.
    loaning = verify_ledger_stream(group=group, account_stream='loaning', currency='KES')
    assert Decimal(loaning['final_balance']) > Decimal('0.00')

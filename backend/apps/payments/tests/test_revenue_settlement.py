"""
Platform revenue settlement tests (Model A).

The platform cut booked to `company_revenue` is swept to a separate company
(`fee`) account. Verifies accrual, idempotent sweep recording targeting the
company account, the blocked-when-unconfigured case, and account resolution.
"""
import pytest
from decimal import Decimal

from apps.groups.models import Group, GroupMember
from apps.payments.models import BankProvider, PaymentProviderAccount, RevenueSweep
from apps.ledger.services import append_ledger_entry
from apps.payments.settlement import (
    sweep_country_revenue, unswept_revenue, accrued_company_revenue,
    custody_account, company_account, active_provider,
)
from common.db_utils import get_db_for_country
from common.middleware import set_current_country, get_current_country

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])

KE = 'kenya'


@pytest.fixture(autouse=True)
def _kenya_ctx():
    prev = get_current_country()
    set_current_country(KE)
    yield
    set_current_country(prev)


@pytest.fixture
def provider_with_accounts(db):
    p = BankProvider.objects.using(KE).create(
        name='Equity Kenya', provider_code='custom', country=KE,
        environment='sandbox', status='active',
    )
    PaymentProviderAccount.objects.using(KE).create(
        provider=p, label='Main custody', account_type='trust',
        account_number='TRUST-001', currency='KES', is_active=True,
    )
    PaymentProviderAccount.objects.using(KE).create(
        provider=p, label='Company revenue', account_type='fee',
        account_number='COMPANY-001', currency='KES', is_active=True,
    )
    return p


def _book_fee(group, member, amount, ref):
    return append_ledger_entry(
        group=group, member=member, account_stream='company_revenue',
        entry_type='service_fee', direction='credit', amount=Decimal(amount),
        currency='KES', description='Test platform fee', reference=ref,
    )


class TestRevenueSettlement:
    def test_accrual_sums_company_revenue(self, group, user, group_member):
        _book_fee(group, user, '100.00', 'FEE-1')
        _book_fee(group, user, '41.50', 'FEE-2')
        accrued = accrued_company_revenue(get_db_for_country(KE))
        assert accrued.get('KES') == Decimal('141.50')

    def test_sweep_records_to_company_account(self, group, user, group_member, provider_with_accounts):
        _book_fee(group, user, '250.00', 'FEE-A')
        created = sweep_country_revenue(KE)
        assert len(created) == 1
        sweep = created[0]
        assert sweep.amount == Decimal('250.00')
        assert sweep.currency == 'KES'
        assert sweep.target_account_ref == 'COMPANY-001'   # the company/fee account
        assert sweep.source_account_ref == 'TRUST-001'     # the main custody account
        assert sweep.status == 'pending'                    # awaiting the live bank transfer

    def test_sweep_is_idempotent(self, group, user, group_member, provider_with_accounts):
        _book_fee(group, user, '250.00', 'FEE-B')
        first = sweep_country_revenue(KE)
        assert len(first) == 1
        # Re-running finds nothing new (the pending sweep already counts).
        second = sweep_country_revenue(KE)
        assert second == []
        assert RevenueSweep.objects.using(KE).filter(country=KE).count() == 1

    def test_only_new_revenue_after_a_sweep_is_swept(self, group, user, group_member, provider_with_accounts):
        _book_fee(group, user, '100.00', 'FEE-C1')
        sweep_country_revenue(KE)
        _book_fee(group, user, '60.00', 'FEE-C2')   # more revenue accrues
        created = sweep_country_revenue(KE)
        assert len(created) == 1
        assert created[0].amount == Decimal('60.00')

    def test_blocked_without_company_account(self, group, user, group_member):
        # No provider/company account configured -> the sweep is recorded blocked,
        # so the accrued cut is visible and not silently lost.
        _book_fee(group, user, '80.00', 'FEE-D')
        created = sweep_country_revenue(KE)
        assert len(created) == 1
        assert created[0].status == 'blocked'
        assert created[0].target_account_ref == ''

    def test_account_resolution(self, provider_with_accounts):
        db = get_db_for_country(KE)
        provider = active_provider(KE, db)
        assert custody_account(provider, 'KES').account_number == 'TRUST-001'
        assert company_account(provider, 'KES').account_number == 'COMPANY-001'

    def test_unswept_excludes_completed(self, group, user, group_member, provider_with_accounts):
        _book_fee(group, user, '90.00', 'FEE-E')
        [sweep] = sweep_country_revenue(KE)
        sweep.status = 'completed'
        sweep.save(using=get_db_for_country(KE))
        # Fully swept -> nothing unswept.
        assert unswept_revenue(KE, get_db_for_country(KE)) == {}

from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.groups.models import Group
from apps.ledger.models import ReconciliationItem, ReconciliationRun


pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


def _create_country_group():
    user = User.objects.create_user(
        email="recon.chair@example.com",
        phone="+254700333444",
        password="password123",
        full_name="Recon Chair",
        country="kenya",
        kyc_status="verified",
    )
    return Group.objects.using("kenya").create(
        name="Daily Recon Chama",
        country="kenya",
        currency="KES",
        max_members=10,
        contribution_amount=Decimal("5000.00"),
        contribution_frequency="monthly",
        contribution_day=1,
        rotation_savings_pct=Decimal("70.00"),
        loan_pool_pct=Decimal("30.00"),
        max_loan_multiplier=Decimal("3.00"),
        loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal("5.00"),
        status="active",
        verification_status="verified",
        chairperson=user,
    )


def test_reconciliation_run_records_suspense_exception_without_balancing_guess():
    from apps.ledger.services import record_reconciliation_exception, start_reconciliation_run

    group = _create_country_group()

    run = start_reconciliation_run(
        country="kenya",
        provider_code="jenga_ke",
        account_stream="rotation",
        account_number="TRUST-KE-001",
        business_date=timezone.now().date(),
        expected_closing_balance=Decimal("10000.00"),
        observed_closing_balance=Decimal("9500.00"),
        source="daily_bank_statement",
    )

    item = record_reconciliation_exception(
        country="kenya",
        account_stream="rotation",
        issue_type="closing_balance_mismatch",
        reference="BANK-STMT-2026-06-12",
        expected_amount=Decimal("10000.00"),
        observed_amount=Decimal("9500.00"),
        currency="KES",
        group=group,
        run=run,
        severity="red",
        details={"difference": "500.00"},
    )

    run.refresh_from_db(using="kenya")
    assert run.status == "needs_review"
    assert item.status == "open"
    assert item.run == run
    assert item.group == group
    assert item.issue_type == "closing_balance_mismatch"
    assert item.details["difference"] == "500.00"

    assert ReconciliationRun.objects.using("kenya").count() == 1
    assert ReconciliationItem.objects.using("kenya").count() == 1

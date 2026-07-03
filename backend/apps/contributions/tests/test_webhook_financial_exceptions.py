from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.contributions.models import Contribution
from apps.groups.models import Group, GroupMember
from apps.ledger.models import LedgerEntry, ReconciliationItem


pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


class AlwaysValidProvider:
    def verify_webhook_signature(self, request):
        return True

    def parse_callback(self, payload):
        return {
            "status": payload["status"],
            "transaction_id": payload["transaction_id"],
            "amount": payload["amount"],
            "reason": payload.get("reason", ""),
            "raw": payload,
        }


def _create_initiated_contribution():
    user = User.objects.create_user(
        email="mismatch.member@example.com",
        phone="+254711111222",
        password="password123",
        full_name="Mismatch Member",
        country="kenya",
        kyc_status="verified",
    )
    group = Group.objects.using("kenya").create(
        name="Webhook Integrity Chama",
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
    GroupMember.objects.using("kenya").create(
        group=group,
        member=user,
        role="chairperson",
        status="active",
        rotation_position=1,
    )
    contribution = Contribution.objects.using("kenya").create(
        group=group,
        member=user,
        amount=Decimal("5000.00"),
        currency="KES",
        method="mpesa",
        mobile_number=user.phone,
        status="initiated",
        scheduled_date=timezone.now().date(),
        provider_reference="PROVIDER-MISMATCH-001",
        platform_reference="PLATFORM-MISMATCH-001",
    )
    return contribution


def test_success_webhook_allocates_contribution_across_wallet_streams(monkeypatch):
    monkeypatch.setattr(
        "apps.contributions.views.get_payment_provider",
        lambda country, method: AlwaysValidProvider(),
    )
    contribution = _create_initiated_contribution()
    group = contribution.group
    group.mandatory_savings_amount = Decimal("500.00")
    group.save(using="kenya", update_fields=["mandatory_savings_amount"])

    response = APIClient().post(
        "/api/v1/contributions/webhook/kenya/mpesa/",
        {
            "status": "success",
            "transaction_id": contribution.provider_reference,
            "amount": "5000.00",
            "reason": "Provider settled successfully",
        },
        format="json",
    )

    assert response.status_code == 200
    contribution.refresh_from_db(using="kenya")
    assert contribution.status == "confirmed"

    entries = {
        entry.account_stream: entry
        for entry in LedgerEntry.objects.using("kenya").filter(related_contribution=contribution)
    }
    assert entries["savings"].amount == Decimal("500.00")
    assert entries["loaning"].amount == Decimal("1350.00")
    assert entries["rotation"].amount == Decimal("3150.00")


def test_success_webhook_with_amount_mismatch_is_frozen_in_suspense(monkeypatch):
    monkeypatch.setattr(
        "apps.contributions.views.get_payment_provider",
        lambda country, method: AlwaysValidProvider(),
    )
    contribution = _create_initiated_contribution()

    response = APIClient().post(
        "/api/v1/contributions/webhook/kenya/mpesa/",
        {
            "status": "success",
            "transaction_id": contribution.provider_reference,
            "amount": "4500.00",
            "reason": "Provider settled a different amount",
        },
        format="json",
    )

    assert response.status_code == 200
    contribution.refresh_from_db(using="kenya")
    assert contribution.status == "disputed"
    assert contribution.actual_amount == Decimal("4500.00")
    assert "amount_mismatch" in contribution.failure_reason

    assert not LedgerEntry.objects.using("kenya").filter(
        reference=contribution.provider_reference,
        account_stream="rotation",
    ).exists()

    suspense_entry = LedgerEntry.objects.using("kenya").get(
        account_stream="suspense",
        related_contribution=contribution,
    )
    assert suspense_entry.amount == Decimal("4500.00")
    assert suspense_entry.source_system == "provider_webhook"

    exception = ReconciliationItem.objects.using("kenya").get(
        related_contribution=contribution,
    )
    assert exception.issue_type == "amount_mismatch"
    assert exception.status == "open"
    assert exception.severity == "red"


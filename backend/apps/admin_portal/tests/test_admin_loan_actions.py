import pytest
from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.ledger.models import LedgerEntry


@pytest.fixture
def country_admin(db):
    return User.objects.create(
        email="loan.admin@averissystems.com",
        phone="+254799002001",
        full_name="Loan Admin",
        role="platform_admin",
        country="kenya",
        kyc_status="verified",
        is_active=True,
        password=make_password("SecurePass123!"),
    )


@pytest.mark.django_db
def test_admin_loan_approval_is_separate_from_disbursement(approved_loan, country_admin):
    approved_loan.status = "pending_admin"
    approved_loan.save(update_fields=["status"])
    client = APIClient()
    client.force_authenticate(user=country_admin)

    approve_response = client.post(
        f"/api/v1/admin-portal/loans/{approved_loan.id}/action/",
        {"action": "approve"},
        format="json",
    )

    assert approve_response.status_code == status.HTTP_200_OK
    approved_loan.refresh_from_db()
    assert approved_loan.status == "approved"
    assert LedgerEntry.objects.filter(related_loan=approved_loan).count() == 0
    assert approved_loan.repayments.count() == 0

    disburse_response = client.post(
        f"/api/v1/admin-portal/loans/{approved_loan.id}/action/",
        {"action": "disburse", "disbursement_reference": "ADMIN-DISB-001"},
        format="json",
    )

    assert disburse_response.status_code == status.HTTP_200_OK
    approved_loan.refresh_from_db()
    assert approved_loan.status == "disbursed"
    assert approved_loan.disbursement_reference == "ADMIN-DISB-001"
    assert LedgerEntry.objects.filter(related_loan=approved_loan).count() == 1
    assert approved_loan.repayments.count() > 0

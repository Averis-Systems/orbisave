import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.groups.models import Group, GroupMember

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


def test_chairperson_registers_authenticates_creates_pending_group_and_sets_pin():
    client = APIClient()
    email = "newchair@test.orbisave.com"
    password = "SecurePass123!"

    register_response = client.post(
        "/api/v1/auth/register/",
        {
            "full_name": "New Chair",
            "email": email,
            "phone": "+254700009901",
            "password": password,
            "role": "chairperson",
            "country": "kenya",
        },
        format="json",
    )
    assert register_response.status_code == status.HTTP_201_CREATED

    token_response = client.post(
        "/api/v1/auth/token/",
        {"email": email, "password": password},
        format="json",
    )
    assert token_response.status_code == status.HTTP_200_OK
    access = token_response.data["access"]

    authed = APIClient()
    authed.credentials(HTTP_AUTHORIZATION=f"Bearer {access}", HTTP_X_COUNTRY="kenya")
    group_response = authed.post(
        "/api/v1/groups/",
        {
            "name": "New Chair Chama",
            "country": "kenya",
            "max_members": 25,
            "contribution_amount": "5000.00",
            "contribution_frequency": "monthly",
            "contribution_day": 1,
            "rotation_savings_pct": "70.00",
            "loan_pool_pct": "30.00",
            "max_loan_multiplier": "3.00",
            "loan_term_weeks": 12,
            "loan_interest_rate_monthly": "5.00",
            "rotation_method": "sequential",
            "mandatory_savings_amount": "500.00",
            "savings_access_month": 12,
            "savings_access_day": 31,
        },
        format="json",
    )
    assert group_response.status_code == status.HTTP_201_CREATED

    pin_response = authed.post(
        "/api/v1/auth/transaction-pin/",
        {"pin": "1234", "password": password},
        format="json",
    )
    assert pin_response.status_code == status.HTTP_200_OK

    group = Group.objects.using("kenya").get(name="New Chair Chama")
    membership = GroupMember.objects.using("kenya").get(group=group)
    assert group.status == "pending_activation"
    assert group.verification_status == "pending_review"
    assert membership.role == "chairperson"
    assert membership.status == "pending_approval"

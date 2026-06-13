from decimal import Decimal

import pytest
from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.groups.models import Group, GroupMember

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


def _pending_group(chairperson):
    group = Group.objects.using("kenya").create(
        name="Refresh Gate Chama",
        description="",
        country="kenya",
        currency="KES",
        max_members=20,
        contribution_amount=Decimal("5000.00"),
        contribution_frequency="weekly",
        contribution_day=1,
        rotation_savings_pct=Decimal("80.00"),
        loan_pool_pct=Decimal("20.00"),
        max_loan_multiplier=Decimal("3.00"),
        loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal("5.00"),
        rotation_method="sequential",
        status="pending_activation",
        verification_status="pending_review",
        chairperson=chairperson,
    )
    GroupMember.objects.using("kenya").create(
        group=group,
        member=chairperson,
        role="chairperson",
        status="pending_approval",
        rotation_position=1,
    )
    return group


@pytest.fixture
def country_admin(db):
    return User.objects.create(
        email="kenya.admin@averissystems.com",
        phone="+254799001001",
        full_name="Kenya Admin",
        role="platform_admin",
        country="kenya",
        kyc_status="verified",
        is_active=True,
        password=make_password("SecurePass123!"),
    )


def test_group_approval_requires_creator_fresh_login_before_chairperson_actions(user, country_admin):
    user.kyc_status = "verified"
    user.save(update_fields=["kyc_status"])
    group = _pending_group(user)

    admin_client = APIClient()
    admin_client.force_authenticate(user=country_admin)

    verify_response = admin_client.post(
        f"/api/v1/admin-portal/groups/{group.id}/verify/",
        {"action": "verify", "note": "KYC approved"},
        format="json",
    )

    assert verify_response.status_code == status.HTTP_200_OK

    group.refresh_from_db(using="kenya")
    membership = GroupMember.objects.using("kenya").get(group=group, member=user)
    assert group.status == "pending_activation"
    assert group.verification_status == "verified"
    assert membership.status == "pending_session_refresh"

    stale_client = APIClient()
    stale_client.force_authenticate(user=user)
    stale_action = stale_client.post(f"/api/v1/groups/{group.id}/pause/", {"reason": "stale"}, format="json")
    assert stale_action.status_code == status.HTTP_403_FORBIDDEN

    login_response = APIClient().post(
        "/api/v1/auth/token/",
        {"email": user.email, "password": "SecurePass123!"},
        format="json",
    )
    assert login_response.status_code == status.HTTP_200_OK

    membership.refresh_from_db(using="kenya")
    user.refresh_from_db()
    assert membership.status == "active"
    assert user.role == "chairperson"

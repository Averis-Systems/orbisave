from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.contributions.models import Contribution
from apps.groups.models import Group, GroupMember, GroupInvite

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


def _make_user(email, role="member", kyc_status="verified", phone="+254700000777"):
    return User.objects.create(
        email=email,
        phone=phone,
        full_name=email.split("@")[0].replace(".", " ").title(),
        role=role,
        country="kenya",
        kyc_status=kyc_status,
        phone_verified=True,  # joining/contributing is phone-verified-gated
        is_active=True,
        next_of_kin_name="Next Kin",
        next_of_kin_phone="+254700000999",
        password=make_password("SecurePass123!"),
    )


def _make_pending_group(chairperson):
    group = Group.objects.using("kenya").create(
        name="Lifecycle Chama",
        country="kenya",
        currency="KES",
        max_members=20,
        contribution_amount=Decimal("5000.00"),
        contribution_frequency="monthly",
        contribution_day=1,
        rotation_savings_pct=Decimal("70.00"),
        loan_pool_pct=Decimal("30.00"),
        max_loan_multiplier=Decimal("3.00"),
        loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal("5.00"),
        mandatory_savings_amount=Decimal("500.00"),
        rotation_method="sequential",
        status="pending_activation",
        verification_status="verified",
        chairperson=chairperson,
    )
    GroupMember.objects.using("kenya").create(
        group=group,
        member=chairperson,
        role="chairperson",
        status="active",
        rotation_position=1,
    )
    return group


@pytest.fixture
def country_admin():
    return _make_user(
        "kenya.admin.lifecycle@test.orbisave.com",
        role="platform_admin",
        phone="+254700000444",
    )


def test_verified_group_stays_pending_until_chairperson_confirmed_contribution(user, country_admin):
    user.kyc_status = "verified"
    user.save(update_fields=["kyc_status"])
    group = _make_pending_group(user)
    group.verification_status = "pending_review"
    group.save(using="kenya", update_fields=["verification_status"])
    GroupMember.objects.using("kenya").filter(group=group, member=user).update(status="pending_approval")

    client = APIClient()
    client.force_authenticate(user=country_admin)
    response = client.post(
        f"/api/v1/admin-portal/groups/{group.id}/verify/",
        {"action": "verify", "note": "KYC approved"},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    group.refresh_from_db(using="kenya")
    assert group.verification_status == "verified"
    assert group.status == "pending_activation"


def test_invites_are_blocked_until_first_chairperson_contribution_is_confirmed():
    chair = _make_user("lifecycle.chair@test.orbisave.com", role="chairperson")
    group = _make_pending_group(chair)
    client = APIClient()
    client.force_authenticate(user=chair)

    blocked = client.post(
        f"/api/v1/groups/{group.id}/invites/",
        {"email": "member@test.orbisave.com"},
        format="json",
        HTTP_X_COUNTRY="kenya",
    )
    assert blocked.status_code == status.HTTP_403_FORBIDDEN

    Contribution.objects.using("kenya").create(
        group=group,
        member=chair,
        amount=Decimal("5000.00"),
        actual_amount=Decimal("5000.00"),
        currency="KES",
        method="mpesa",
        mobile_number=chair.phone,
        provider_reference="CHAIR-FIRST",
        platform_reference="CHAIR-FIRST-PLATFORM",
        status="confirmed",
        scheduled_date=timezone.now().date(),
        confirmed_at=timezone.now(),
    )

    group.refresh_from_db(using="kenya")
    assert group.status == "active"

    allowed = client.post(
        f"/api/v1/groups/{group.id}/invites/",
        {"email": "member@test.orbisave.com"},
        format="json",
        HTTP_X_COUNTRY="kenya",
    )
    assert allowed.status_code == status.HTTP_201_CREATED

    member = _make_user("not.chair@test.orbisave.com", phone="+254700000555")
    GroupMember.objects.using("kenya").create(
        group=group,
        member=member,
        role="member",
        status="active",
        rotation_position=2,
    )
    non_chair_client = APIClient()
    non_chair_client.force_authenticate(user=member)
    forbidden = non_chair_client.post(
        f"/api/v1/groups/{group.id}/invites/",
        {"email": "other@test.orbisave.com"},
        format="json",
        HTTP_X_COUNTRY="kenya",
    )
    assert forbidden.status_code == status.HTTP_403_FORBIDDEN


def test_invitee_is_pending_until_mandatory_contribution_and_expires_after_24_hours():
    chair = _make_user("active.chair@test.orbisave.com", role="chairperson", phone="+254700000111")
    member = _make_user("pending.member@test.orbisave.com", phone="+254700000222")
    group = _make_pending_group(chair)
    group.status = "active"
    group.save(using="kenya", update_fields=["status"])
    invite = GroupInvite.objects.using("kenya").create(
        group=group,
        invited_by=chair,
        contact=member.email,
        contact_type="email",
        token="pending-member-token",
        expires_at=timezone.now() + timedelta(days=7),
    )

    client = APIClient()
    client.force_authenticate(user=member)
    accept = client.post(
        f"/api/v1/invites/{invite.token}/accept/",
        {},
        format="json",
        HTTP_X_COUNTRY="kenya",
    )
    assert accept.status_code == status.HTTP_200_OK

    membership = GroupMember.objects.using("kenya").get(group=group, member=member)
    assert membership.status == "pending_approval"

    Contribution.objects.using("kenya").create(
        group=group,
        member=member,
        amount=Decimal("500.00"),
        actual_amount=Decimal("500.00"),
        currency="KES",
        method="mpesa",
        mobile_number=member.phone,
        provider_reference="MEMBER-MANDATORY",
        platform_reference="MEMBER-MANDATORY-PLATFORM",
        status="confirmed",
        scheduled_date=timezone.now().date(),
        confirmed_at=timezone.now(),
    )
    membership.refresh_from_db(using="kenya")
    assert membership.status == "active"

    late_member = _make_user("late.member@test.orbisave.com", phone="+254700000333")
    late_membership = GroupMember.objects.using("kenya").create(
        group=group,
        member=late_member,
        role="member",
        status="pending_approval",
        rotation_position=3,
    )
    GroupMember.objects.using("kenya").filter(id=late_membership.id).update(
        joined_at=timezone.now() - timedelta(hours=25)
    )

    from apps.groups.tasks import expire_pending_memberships

    result = expire_pending_memberships()
    late_membership.refresh_from_db(using="kenya")
    assert result["expired"] == 1
    assert late_membership.status == "exited"

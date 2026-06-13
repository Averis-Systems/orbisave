import pytest
from rest_framework import status

from apps.groups.models import Group, GroupMember

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


def _group_payload(**overrides):
    payload = {
        "name": "Pending Approval Chama",
        "country": "kenya",
        "max_members": 25,
        "contribution_amount": "5000.00",
        "contribution_frequency": "weekly",
        "contribution_day": 1,
        "rotation_savings_pct": "80.00",
        "loan_pool_pct": "20.00",
        "max_loan_multiplier": "3.00",
        "loan_term_weeks": 12,
        "loan_interest_rate_monthly": "5.00",
        "rotation_method": "sequential",
        "mandatory_savings_amount": "500.00",
        "savings_access_month": 12,
        "savings_access_day": 31,
    }
    payload.update(overrides)
    return payload


def test_group_creation_starts_pending_and_does_not_promote_user(member_client, user):
    user.kyc_status = "pending"
    user.save(update_fields=["kyc_status"])

    response = member_client.post("/api/v1/groups/", _group_payload(), format="json")

    assert response.status_code == status.HTTP_201_CREATED

    group = Group.objects.using("kenya").get(name="Pending Approval Chama")
    membership = GroupMember.objects.using("kenya").get(group=group, member=user)

    assert group.status == "pending_activation"
    assert group.verification_status == "pending_review"
    assert group.mandatory_savings_amount == 500
    assert group.savings_access_month == 12
    assert group.savings_access_day == 31
    assert membership.role == "chairperson"
    assert membership.status == "pending_approval"

    user.refresh_from_db()
    assert user.role == "member"


def test_pending_chairperson_cannot_use_chairperson_actions(member_client, user):
    response = member_client.post("/api/v1/groups/", _group_payload(name="Locked Chama"), format="json")
    assert response.status_code == status.HTTP_201_CREATED

    group = Group.objects.using("kenya").get(name="Locked Chama")

    pause_response = member_client.post(f"/api/v1/groups/{group.id}/pause/", {"reason": "test"}, format="json")

    assert pause_response.status_code == status.HTTP_403_FORBIDDEN

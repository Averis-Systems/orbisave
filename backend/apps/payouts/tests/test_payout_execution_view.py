from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.groups.models import Group, GroupMember, RotationCycle, RotationSchedule

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


def _active_verified_group(chairperson, member):
    group = Group.objects.using("kenya").create(
        name="Payout Safe Chama",
        description="",
        country="kenya",
        currency="KES",
        max_members=10,
        contribution_amount=Decimal("1000.00"),
        contribution_frequency="weekly",
        contribution_day=1,
        rotation_savings_pct=Decimal("80.00"),
        loan_pool_pct=Decimal("20.00"),
        max_loan_multiplier=Decimal("3.00"),
        loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal("5.00"),
        rotation_method="sequential",
        status="active",
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
    GroupMember.objects.using("kenya").create(
        group=group,
        member=member,
        role="member",
        status="active",
        rotation_position=2,
    )
    cycle = RotationCycle.objects.using("kenya").create(
        group=group,
        cycle_number=1,
        start_date=timezone.now().date(),
        end_date=timezone.now().date(),
        is_current=True,
        status="open",
    )
    RotationSchedule.objects.using("kenya").create(
        group=group,
        member=member,
        cycle_number=1,
        scheduled_payout_date=timezone.now().date(),
        is_paid_out=False,
    )
    return group, cycle


def test_payout_execution_uses_schedule_recipient_not_request_target(chairperson, user):
    group, _cycle = _active_verified_group(chairperson, user)
    chairperson.transaction_pin = make_password("1234")
    chairperson.save(update_fields=["transaction_pin"])
    client = APIClient()
    client.force_authenticate(user=chairperson)

    with patch("apps.payouts.views.PayoutService.execute_rotation_payout") as execute:
        execute.return_value = type(
            "PayoutResult",
            (),
            {"id": "payout-1", "net_amount": Decimal("950.00"), "status": "processing"},
        )()

        response = client.post(
            f"/api/v1/payouts/{group.id}/execute/",
            {"target_member_id": str(chairperson.id), "pin": "1234"},
            format="json",
        )

    assert response.status_code == status.HTTP_201_CREATED
    called_group, called_member = execute.call_args.args
    assert called_group.id == group.id
    assert called_member.id == user.id


def test_payout_execution_requires_transaction_pin(chairperson, user):
    group, _cycle = _active_verified_group(chairperson, user)
    chairperson.transaction_pin = make_password("1234")
    chairperson.save(update_fields=["transaction_pin"])
    client = APIClient()
    client.force_authenticate(user=chairperson)

    with patch("apps.payouts.views.PayoutService.execute_rotation_payout") as execute:
        response = client.post(f"/api/v1/payouts/{group.id}/execute/", {}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["error"] == "Transaction PIN is required to authorise this payout."
    execute.assert_not_called()


def test_wrong_payout_pin_is_rejected_and_counted(chairperson, user):
    group, _cycle = _active_verified_group(chairperson, user)
    chairperson.transaction_pin = make_password("1234")
    chairperson.save(update_fields=["transaction_pin"])
    client = APIClient()
    client.force_authenticate(user=chairperson)

    with patch("apps.payouts.views.PayoutService.execute_rotation_payout") as execute:
        response = client.post(
            f"/api/v1/payouts/{group.id}/execute/",
            {"pin": "9999"},
            format="json",
        )

    chairperson.refresh_from_db()
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.data["error"] == "Transaction PIN verification failed."
    assert chairperson.transaction_pin_failed_attempts == 1
    execute.assert_not_called()


def test_non_leader_cannot_execute_payout(chairperson, user):
    group, _cycle = _active_verified_group(chairperson, user)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(f"/api/v1/payouts/{group.id}/execute/", {}, format="json")

    assert response.status_code == status.HTTP_403_FORBIDDEN

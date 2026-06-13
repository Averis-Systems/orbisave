from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.contributions.models import Contribution
from apps.groups.models import Group, GroupMember, RotationCycle, RotationSchedule


pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


def _create_rotation_context(chairperson, member):
    second_member = User.objects.create_user(
        email="second.rotation.member@example.com",
        phone="+254733333333",
        password="password123",
        full_name="Second Rotation Member",
        country="kenya",
        kyc_status="verified",
    )
    group = Group.objects.using("kenya").create(
        name="Readiness Chama",
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
    for position, user, role in (
        (1, chairperson, "chairperson"),
        (2, member, "member"),
        (3, second_member, "member"),
    ):
        GroupMember.objects.using("kenya").create(
            group=group,
            member=user,
            role=role,
            status="active",
            rotation_position=position,
        )

    today = timezone.localdate()
    cycle = RotationCycle.objects.using("kenya").create(
        group=group,
        cycle_number=1,
        start_date=today - timedelta(days=7),
        end_date=today,
        is_current=True,
        status="open",
    )
    schedule = RotationSchedule.objects.using("kenya").create(
        group=group,
        member=member,
        cycle_number=1,
        scheduled_payout_date=today,
        is_paid_out=False,
    )
    return group, cycle, schedule, [chairperson, member, second_member]


def _confirm_contribution(group, cycle, member, index):
    return Contribution.objects.using("kenya").create(
        group=group,
        member=member,
        amount=group.contribution_amount,
        actual_amount=group.contribution_amount,
        currency=group.currency,
        method="mpesa",
        mobile_number=member.phone,
        provider_reference=f"READY-PROVIDER-{index}",
        platform_reference=f"READY-PLATFORM-{index}",
        cycle=cycle,
        status="confirmed",
        scheduled_date=timezone.localdate(),
        confirmed_at=timezone.now(),
    )


def test_rotation_payout_is_ready_immediately_when_all_members_contributed(chairperson, user):
    from apps.payouts.services import PayoutService

    group, cycle, schedule, members = _create_rotation_context(chairperson, user)
    for index, member in enumerate(members, start=1):
        _confirm_contribution(group, cycle, member, index)

    readiness = PayoutService.evaluate_rotation_payout_readiness(group, cycle=cycle)

    assert readiness["status"] == "ready_for_disbursement"
    assert readiness["should_disburse"] is True
    assert readiness["recipient_id"] == str(schedule.member_id)
    assert readiness["missing_member_ids"] == []


def test_rotation_payout_enters_one_day_grace_when_contributions_are_missing(chairperson, user):
    from apps.payouts.services import PayoutService

    group, cycle, _schedule, members = _create_rotation_context(chairperson, user)
    _confirm_contribution(group, cycle, members[0], 1)
    _confirm_contribution(group, cycle, members[1], 2)

    readiness = PayoutService.evaluate_rotation_payout_readiness(group, cycle=cycle)

    assert readiness["status"] == "grace_period"
    assert readiness["should_disburse"] is False
    assert readiness["missing_member_ids"] == [str(members[2].id)]
    assert readiness["grace_deadline"] == timezone.localdate() + timedelta(days=1)


def test_rotation_payout_waits_for_review_after_grace_expires(chairperson, user):
    from apps.payouts.services import PayoutService

    group, cycle, _schedule, members = _create_rotation_context(chairperson, user)
    _confirm_contribution(group, cycle, members[0], 1)
    as_of = timezone.now() + timedelta(days=2)

    readiness = PayoutService.evaluate_rotation_payout_readiness(group, cycle=cycle, as_of=as_of)

    assert readiness["status"] == "awaiting_contributions"
    assert readiness["should_disburse"] is False
    assert set(readiness["missing_member_ids"]) == {str(members[1].id), str(members[2].id)}


def test_process_due_rotation_payout_executes_only_when_ready(chairperson, user):
    from apps.payouts.services import PayoutService

    group, cycle, schedule, members = _create_rotation_context(chairperson, user)
    for index, member in enumerate(members, start=1):
        _confirm_contribution(group, cycle, member, index)

    payout_result = type("PayoutResult", (), {"status": "completed"})()
    with patch.object(PayoutService, "execute_rotation_payout", return_value=payout_result) as execute:
        result = PayoutService.process_due_rotation_payout(group, cycle=cycle)

    assert result["readiness"]["status"] == "ready_for_disbursement"
    assert result["payout"] == payout_result
    called_group, called_member = execute.call_args.args
    assert called_group == group
    assert called_member.id == schedule.member_id

    schedule.refresh_from_db(using="kenya")
    assert schedule.is_paid_out is True


def test_process_due_rotation_payout_does_not_execute_during_grace(chairperson, user):
    from apps.payouts.services import PayoutService

    group, cycle, schedule, members = _create_rotation_context(chairperson, user)
    _confirm_contribution(group, cycle, members[0], 1)

    with patch.object(PayoutService, "execute_rotation_payout") as execute:
        result = PayoutService.process_due_rotation_payout(group, cycle=cycle)

    execute.assert_not_called()
    assert result["payout"] is None
    assert result["readiness"]["status"] == "grace_period"

    schedule.refresh_from_db(using="kenya")
    assert schedule.is_paid_out is False

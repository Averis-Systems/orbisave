from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

COUNTRY_DATABASE_ALIASES = ["kenya", "rwanda", "ghana"]
PENDING_MEMBER_GRACE_PERIOD = timedelta(hours=24)


def get_group_db_alias(group):
    return group._state.db or group.country or "default"


def mandatory_activation_amount(group):
    amount = group.mandatory_savings_amount or group.contribution_amount
    return Decimal(amount)


def pending_membership_expired(membership, now=None):
    now = now or timezone.now()
    return membership.joined_at + PENDING_MEMBER_GRACE_PERIOD < now


def verify_pending_groups_for_chairperson(user, verified_by=None, note="Chairperson KYC verified."):
    from apps.groups.models import Group, GroupMember

    updated = 0
    now = timezone.now()
    for alias in COUNTRY_DATABASE_ALIASES:
        groups = Group.objects.using(alias).filter(
            chairperson=user,
            verification_status="pending_review",
        )
        for group in groups:
            group.verification_status = "verified"
            group.status = "pending_activation"
            group.verification_note = note
            group.verified_by = verified_by
            group.verified_at = now
            group.save(
                using=alias,
                update_fields=[
                    "verification_status",
                    "status",
                    "verification_note",
                    "verified_by",
                    "verified_at",
                ],
            )
            GroupMember.objects.using(alias).filter(
                group=group,
                role="chairperson",
                status="pending_approval",
            ).update(status="pending_session_refresh")
            updated += 1
    return updated


def apply_confirmed_contribution_lifecycle(contribution):
    if contribution.status != "confirmed":
        return

    from apps.groups.models import GroupMember

    group = contribution.group
    db_alias = get_group_db_alias(group)
    membership = GroupMember.objects.using(db_alias).filter(
        group=group,
        member=contribution.member,
    ).first()
    if not membership:
        return

    threshold = mandatory_activation_amount(group)
    actual_amount = contribution.actual_amount or contribution.amount

    if (
        membership.role == "chairperson"
        and group.status == "pending_activation"
        and group.verification_status == "verified"
        and actual_amount >= threshold
    ):
        group.status = "active"
        group.save(using=db_alias, update_fields=["status"])
        if membership.status != "active":
            membership.status = "active"
            membership.save(using=db_alias, update_fields=["status"])
        return

    if membership.role == "member" and membership.status == "pending_approval":
        if pending_membership_expired(membership):
            membership.status = "exited"
            membership.exited_at = timezone.now()
            membership.save(using=db_alias, update_fields=["status", "exited_at"])
            return

        if group.status == "active" and actual_amount >= threshold:
            membership.status = "active"
            membership.save(using=db_alias, update_fields=["status"])

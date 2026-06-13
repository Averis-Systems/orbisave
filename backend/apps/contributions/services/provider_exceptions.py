from decimal import Decimal

from apps.ledger.services import record_reconciliation_exception
from common.db_utils import get_db_for_group


def freeze_contribution_amount_mismatch(
    *,
    contribution,
    country,
    provider_id,
    observed_amount,
    raw_payload,
):
    """
    Fail closed when a provider says "success" but the amount does not match.

    The contribution is not confirmed, and the money is represented only in
    suspense until finance/compliance resolves the discrepancy.
    """
    db_alias = contribution._state.db or get_db_for_group(contribution.group)
    expected_amount = Decimal(contribution.amount)
    observed_amount = Decimal(observed_amount)
    provider_reference = contribution.provider_reference or raw_payload.get("transaction_id", "")
    reason = (
        f"amount_mismatch: expected {expected_amount} {contribution.currency}, "
        f"observed {observed_amount} {contribution.currency}"
    )

    contribution.status = "disputed"
    contribution.actual_amount = observed_amount
    contribution.failure_reason = reason
    contribution.save(
        using=db_alias,
        update_fields=["status", "actual_amount", "failure_reason", "updated_at"],
    )

    return record_reconciliation_exception(
        country=country,
        account_stream="rotation",
        issue_type="amount_mismatch",
        reference=provider_reference,
        expected_amount=expected_amount,
        observed_amount=observed_amount,
        currency=contribution.currency,
        group=contribution.group,
        related_contribution=contribution,
        provider_reference=provider_reference,
        severity="red",
        details={
            "provider": provider_id,
            "platform_reference": contribution.platform_reference,
            "raw_payload": raw_payload,
        },
        isolate_to_suspense=True,
        member=contribution.member,
        source_system="provider_webhook",
    )

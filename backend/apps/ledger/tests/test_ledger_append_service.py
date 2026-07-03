from decimal import Decimal

import pytest

from apps.ledger.models import LedgerEntry


@pytest.mark.django_db
def test_append_ledger_entry_sets_stream_and_chains_hash_per_account_stream(group, user):
    from apps.ledger.services import append_ledger_entry

    first = append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Initial contribution",
        reference="LEDGER-TEST-001",
        idempotency_key="idem-001",
    )
    second = append_ledger_entry(
        group=group,
        member=user,
        account_stream="savings",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("250.00"),
        currency="KES",
        description="Mandatory savings split",
        reference="LEDGER-TEST-002",
        idempotency_key="idem-002",
    )

    assert first.account_stream == "rotation"
    assert second.account_stream == "savings"
    assert second.previous_hash == '0' * 64
    assert first.hash != second.hash
    assert first.running_balance == Decimal("1000.00")
    assert second.running_balance == Decimal("250.00")


@pytest.mark.django_db
def test_append_ledger_entry_is_idempotent_for_same_key(group, user):
    from apps.ledger.services import append_ledger_entry

    first = append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Initial contribution",
        reference="LEDGER-IDEM-001",
        idempotency_key="idem-repeat",
    )
    second = append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Initial contribution retry",
        reference="LEDGER-IDEM-001-RETRY",
        idempotency_key="idem-repeat",
    )

    assert first.id == second.id
    assert LedgerEntry.objects.filter(group=group).count() == 1


@pytest.mark.django_db
def test_group_wallet_uses_actual_account_stream_balances(group, user):
    from apps.groups.serializers import WalletCalculations
    from apps.ledger.services import append_ledger_entry
    from django.core.cache import cache

    cache.delete(f"group_wallet_{group.id}")

    append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("3150.00"),
        currency="KES",
        description="Rotation allocation",
        reference="LEDGER-WALLET-ROTATION",
    )
    append_ledger_entry(
        group=group,
        member=user,
        account_stream="loaning",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1350.00"),
        currency="KES",
        description="Loaning allocation",
        reference="LEDGER-WALLET-LOANING",
    )
    append_ledger_entry(
        group=group,
        member=user,
        account_stream="savings",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("500.00"),
        currency="KES",
        description="Mandatory savings allocation",
        reference="LEDGER-WALLET-SAVINGS",
    )

    wallet = WalletCalculations.get_cached_group_wallet(group)

    assert wallet["rotation_pool"] == 3150.0
    assert wallet["loan_pool"] == 1350.0
    assert wallet["mandatory_savings"] == 500.0
    assert wallet["total"] == 5000.0


@pytest.mark.django_db
def test_ledger_entry_updates_are_blocked(group, user):
    from apps.ledger.services import append_ledger_entry

    entry = append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Initial contribution",
        reference="LEDGER-IMMUTABLE-001",
    )

    entry.description = "tampered"
    with pytest.raises(PermissionError, match="immutable"):
        entry.save()


@pytest.mark.django_db
def test_append_ledger_entry_creates_stream_lock_and_event_group(group, user):
    from apps.ledger.models import LedgerEventGroup, LedgerStreamLock
    from apps.ledger.services import append_ledger_entry

    entry = append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Contribution allocation",
        reference="LEDGER-EVENT-001",
        idempotency_key="ledger-event-001",
        event_group_key="contribution:provider:abc123",
        event_type="provider_collection_settled",
    )

    stream_lock = LedgerStreamLock.objects.get(
        group=group,
        account_stream="rotation",
        currency="KES",
    )
    event_group = LedgerEventGroup.objects.get(event_group_key="contribution:provider:abc123")

    assert entry.sequence_number == 1
    assert stream_lock.last_sequence_number == 1
    assert stream_lock.last_hash == entry.hash
    assert entry.event_group == event_group
    assert event_group.event_type == "provider_collection_settled"


@pytest.mark.django_db
def test_append_ledger_entry_rejects_unbalanced_event_group_when_closed(group, user):
    from apps.ledger.services import append_ledger_entry, close_ledger_event_group

    append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="One-sided contribution allocation",
        reference="LEDGER-UNBALANCED-001",
        idempotency_key="ledger-unbalanced-001",
        event_group_key="event:unbalanced",
        event_type="provider_collection_settled",
    )

    with pytest.raises(ValueError, match="not balanced"):
        close_ledger_event_group("event:unbalanced")


@pytest.mark.django_db
def test_append_ledger_entry_allows_balanced_event_group_to_close(group, user):
    from apps.ledger.models import LedgerEventGroup
    from apps.ledger.services import append_ledger_entry, close_ledger_event_group

    append_ledger_entry(
        group=group,
        member=user,
        account_stream="provider_settlement",
        entry_type="contribution",
        direction="debit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Cash movement from provider",
        reference="LEDGER-BALANCED-DR",
        idempotency_key="ledger-balanced-dr",
        event_group_key="event:balanced",
        event_type="provider_collection_settled",
    )
    append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Rotation allocation",
        reference="LEDGER-BALANCED-CR",
        idempotency_key="ledger-balanced-cr",
        event_group_key="event:balanced",
        event_type="provider_collection_settled",
    )

    event_group = close_ledger_event_group("event:balanced")

    assert event_group.status == LedgerEventGroup.STATUS_CLOSED


@pytest.mark.django_db
def test_append_ledger_entry_rejects_debit_that_overdraws_protected_stream(group, user):
    from apps.ledger.services import append_ledger_entry

    with pytest.raises(ValueError, match="Insufficient ledger balance"):
        append_ledger_entry(
            group=group,
            member=user,
            account_stream="rotation",
            entry_type="payout",
            direction="debit",
            amount=Decimal("1000.00"),
            currency="KES",
            description="Impossible payout",
            reference="LEDGER-OVERDRAW-001",
            idempotency_key="ledger-overdraw-001",
        )


@pytest.mark.django_db
def test_ledger_hash_chain_verifier_detects_tampering(group, user):
    from apps.ledger.services import append_ledger_entry, verify_ledger_stream

    entry = append_ledger_entry(
        group=group,
        member=user,
        account_stream="rotation",
        entry_type="contribution",
        direction="credit",
        amount=Decimal("1000.00"),
        currency="KES",
        description="Initial contribution",
        reference="LEDGER-VERIFY-001",
        idempotency_key="ledger-verify-001",
    )

    assert verify_ledger_stream(group=group, account_stream="rotation", currency="KES")["valid"] is True

    LedgerEntry.objects.filter(id=entry.id).update(amount=Decimal("999.00"))

    result = verify_ledger_stream(group=group, account_stream="rotation", currency="KES")

    assert result["valid"] is False
    assert result["errors"][0]["code"] == "hash_mismatch"

from decimal import Decimal

import pytest

from apps.ledger.models import LedgerEntry


@pytest.mark.django_db
def test_append_ledger_entry_sets_stream_and_chains_hash(group, user):
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
    assert second.previous_hash == first.hash
    assert first.hash != second.hash


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

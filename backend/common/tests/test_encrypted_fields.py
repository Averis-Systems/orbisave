"""
Secrets-at-rest round-trip tests: application code sees plaintext, the
database row holds only opaque enc$v1$ tokens, and legacy plaintext rows
read through unchanged (then encrypt on next save).
"""
import pytest
from django.db import connections

from apps.payments.models import BankProvider
from common.encryption import ENCRYPTED_PREFIX, decrypt_value, encrypt_value

# Plain django_db (default alias only) — matches the passing provider-config
# suite. The test settings dedupe all country aliases into one physical DB;
# declaring extra aliases here trips connection-routing quirks (see test.py).
pytestmark = pytest.mark.django_db


def _db_alias(instance):
    return instance._state.db or 'default'


def _raw_column(provider, column):
    # Raw SQL must hit the same database the router sent the ORM write to.
    # SQLite stores UUID PKs as undashed 32-char hex — use .hex, not str().
    with connections[_db_alias(provider)].cursor() as cursor:
        cursor.execute(
            f"SELECT {column} FROM payment_bank_provider WHERE id = %s",  # noqa: S608 — column name is test-controlled
            [provider.id.hex],
        )
        row = cursor.fetchone()
    assert row is not None, 'raw lookup found no row — UUID param format mismatch?'
    return row[0]


def test_encrypt_decrypt_round_trip():
    secret = 'jenga-consumer-secret-123'
    stored = encrypt_value(secret)
    assert stored.startswith(ENCRYPTED_PREFIX)
    assert secret not in stored
    assert decrypt_value(stored) == secret


def test_encrypt_never_double_wraps():
    once = encrypt_value('abc')
    twice = encrypt_value(once)
    assert once == twice
    assert decrypt_value(twice) == 'abc'


def test_blank_values_stay_blank():
    assert encrypt_value('') == ''
    assert decrypt_value('') == ''


def test_bank_provider_secrets_encrypted_at_rest():
    provider = BankProvider.objects.create(
        name='Equity Bank Kenya',
        provider_code='jenga_ke',
        country='kenya',
        environment='sandbox',
        api_key='consumer-key-xyz',
        api_secret='consumer-secret-xyz',
        webhook_secret='hook-secret-xyz',
        extra_config={'private_key': '-----BEGIN RSA PRIVATE KEY-----abc', 'paybill': '247247'},
    )

    # ORM round-trip: application code sees plaintext.
    fresh = BankProvider.objects.get(id=provider.id)
    assert fresh.api_key == 'consumer-key-xyz'
    assert fresh.api_secret == 'consumer-secret-xyz'
    assert fresh.webhook_secret == 'hook-secret-xyz'
    assert fresh.extra_config['private_key'].startswith('-----BEGIN RSA')

    # Raw row: the database only holds opaque tokens.
    for column, plaintext in [
        ('api_key', 'consumer-key-xyz'),
        ('api_secret', 'consumer-secret-xyz'),
        ('webhook_secret', 'hook-secret-xyz'),
    ]:
        raw = _raw_column(provider, column)
        assert raw.startswith(ENCRYPTED_PREFIX), f'{column} stored in plaintext'
        assert plaintext not in raw

    raw_extra = _raw_column(provider, 'extra_config')
    assert 'BEGIN RSA' not in raw_extra


def test_legacy_plaintext_rows_read_through():
    provider = BankProvider.objects.create(
        name='Legacy Row', provider_code='custom', country='kenya',
    )
    # Simulate a pre-encryption row written before this change.
    with connections[_db_alias(provider)].cursor() as cursor:
        cursor.execute(
            "UPDATE payment_bank_provider SET api_key = %s WHERE id = %s",
            ['legacy-plaintext-key', provider.id.hex],
        )
        assert cursor.rowcount == 1

    fresh = BankProvider.objects.using(_db_alias(provider)).get(id=provider.id)
    assert fresh.api_key == 'legacy-plaintext-key'

    # Saving re-writes it encrypted.
    fresh.save()
    assert _raw_column(fresh, 'api_key').startswith(ENCRYPTED_PREFIX)

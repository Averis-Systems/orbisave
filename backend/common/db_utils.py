"""
Centralised multi-DB routing utility.
Satisfies System Design Checklist Section 3 (Database Design) and Section 11 (Multi-Tenancy).

Usage:
    from common.db_utils import get_db_for_group
    with transaction.atomic(using=get_db_for_group(group)):
        ...
"""
import hashlib
from contextlib import contextmanager
from threading import Lock

from django.conf import settings
from django.db import connections


# Process-local fallback for engines without advisory locks (SQLite in dev/tests).
_advisory_local_lock = Lock()


def advisory_lock_key(*parts) -> int:
    """A stable signed-64-bit key for pg_advisory_xact_lock from any identifiers."""
    raw = ':'.join(str(p) for p in parts).encode()
    return int(hashlib.blake2s(raw, digest_size=8).hexdigest(), 16) % (2 ** 63 - 1)


@contextmanager
def advisory_xact_lock(db_alias, *key_parts):
    """
    Serialize a money-critical section per key on `db_alias`.

    MUST be entered INSIDE `transaction.atomic(using=db_alias)`: pg_advisory_xact_lock
    is transaction-scoped and released automatically on commit or rollback, so the
    lock covers exactly the work in the surrounding transaction. Two concurrent
    payout / loan-disbursement attempts for the same (group, cycle, recipient) or
    the same loan serialize, the second blocks until the first commits, then
    re-reads and sees the completed state instead of sending a second payment.

    On SQLite (dev/tests) there are no advisory locks, so a process-local
    threading.Lock stands in, which is enough to serialize the test process.
    """
    conn = connections[db_alias]
    if conn.vendor == 'postgresql':
        with conn.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_xact_lock(%s)', [advisory_lock_key(*key_parts)])
            yield
    else:
        with _advisory_local_lock:
            yield


# Country strings mapped to their DB alias names.
COUNTRY_DB_MAP = {
    'kenya':  'kenya',
    'rwanda': 'rwanda',
    'ghana':  'ghana',
}


def get_db_for_group(group) -> str:
    """
    Returns the correct database alias for a group's country.

    Falls back to 'default' if:
    - The group has no country set.
    - The country's DB is not configured (e.g. local dev / SQLite environment).
    - The country is unrecognised.

    This prevents `transaction.atomic(using='kenya')` from crashing in dev
    when only the 'default' SQLite database exists.
    """
    country = getattr(group, 'country', None)
    if not country:
        return 'default'

    alias = COUNTRY_DB_MAP.get(country.lower(), 'default')

    # Safety check: if the DB alias is not in settings.DATABASES, fall back gracefully.
    if alias not in settings.DATABASES:
        return 'default'

    return alias


def get_db_for_country(country: str) -> str:
    """
    Returns the correct database alias for a raw country string.
    Useful in webhook handlers where we only have the country, not a Group object.
    """
    if not country:
        return 'default'
    alias = COUNTRY_DB_MAP.get(country.lower(), 'default')
    if alias not in settings.DATABASES:
        return 'default'
    return alias


def financial_db_aliases():
    """
    Every configured alias that can hold financial rows ('default' first).
    Cross-country admin views use this to locate a row whose country is not
    known up front, CountryMiddleware runs before DRF's JWT auth, so
    thread-local routing cannot be relied on for authenticated admin traffic.
    """
    aliases = ['default']
    for alias in COUNTRY_DB_MAP.values():
        if alias in settings.DATABASES and alias not in aliases:
            aliases.append(alias)
    return aliases


def find_across_financial_dbs(model, **filters):
    """First matching instance of `model` across all financial aliases, or None."""
    for alias in financial_db_aliases():
        instance = model.objects.using(alias).filter(**filters).first()
        if instance is not None:
            return instance
    return None

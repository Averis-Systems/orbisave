"""
Centralised multi-DB routing utility.
Satisfies System Design Checklist Section 3 (Database Design) and Section 11 (Multi-Tenancy).

Usage:
    from common.db_utils import get_db_for_group
    with transaction.atomic(using=get_db_for_group(group)):
        ...
"""
from django.conf import settings


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

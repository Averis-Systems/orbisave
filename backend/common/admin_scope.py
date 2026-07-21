"""
Country scoping for admin requests, in one place.

Three copies of a _country_scope(request) helper had grown across the admin
portal, with two different return shapes and one dangerous behaviour: a
platform_admin whose account had no country was silently filtered to
{'country': None}, which matches NULL rows, so their portal rendered empty
lists instead of telling anyone the account was misconfigured. An admin
looking at an empty KYC queue cannot tell "nothing to review" from "I am seeing
nothing because my account is broken".

This module is the single authority. The rules:

- A super_admin may target any one country via ?country=, or omit it to mean
  platform-wide.
- A platform_admin always operates on their own country. A ?country= naming a
  different country is refused loudly, never silently ignored: silently
  ignoring it means the URL LOOKS like it worked, and an admin who bookmarks
  ?country=rwanda believes they are looking at Rwanda.
- A platform_admin with no country is refused outright.

The ?country= query parameter is the only client-supplied country signal.
X-Country is not consulted here and must never be: CountryMiddleware runs
before DRF authentication, so that header was never authorisation-checked,
which is exactly why the portals' proxies now strip it.
"""
from rest_framework.exceptions import PermissionDenied, ValidationError

# The deployable countries. Mirrors common.db_utils.COUNTRY_DB_MAP; kept as an
# explicit list so an unknown value fails validation rather than routing.
ADMIN_COUNTRIES = ('kenya', 'rwanda', 'ghana')


def resolve_admin_country(request):
    """
    The country this admin request is authorised to target.

    Returns a country name, or None meaning platform-wide (super_admin only).
    Raises PermissionDenied / ValidationError; both render as structured DRF
    error responses, so callers just call this and use the result.
    """
    user = request.user
    requested = (request.query_params.get('country') or '').strip().lower()

    if user.role == 'super_admin':
        if not requested or requested == 'all':
            return None
        if requested not in ADMIN_COUNTRIES:
            raise ValidationError({'country': f"Unknown country '{requested}'."})
        return requested

    own = (user.country or '').strip().lower()
    if not own:
        # Fail loudly: this is a misconfigured staff account, not an empty
        # dataset, and the difference matters on an oversight surface.
        raise PermissionDenied(
            'Your admin account has no country assigned, so it cannot access '
            'country data. Ask the platform owner to fix the account.'
        )
    if requested and requested != own:
        raise PermissionDenied('You may only access data for your own country.')
    return own


def scope_filter(country, field='country'):
    """
    The resolver's result as queryset filter kwargs.

    None (platform-wide) becomes an empty dict, which filters nothing. The
    field name is parameterised because some models reach country through a
    relation (run__country, group__country).
    """
    return {field: country} if country else {}


def shard_aliases(country):
    """
    The database aliases an admin's list request must read.

    A resolved country reads exactly that country's shard. Platform-wide (None,
    super_admin) reads every country shard. This is for the models that live
    ONLY in the country databases (groups, loans, contributions): 'default' is
    not included because those tables are empty there, and a country-scoped
    admin must not have their query fall back to the wrong shard.
    """
    from common.db_utils import COUNTRY_DB_MAP, get_db_for_country
    if country:
        return [get_db_for_country(country)]
    return [alias for c, alias in COUNTRY_DB_MAP.items() if c in ADMIN_COUNTRIES]

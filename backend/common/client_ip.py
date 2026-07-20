"""
Recover the real client IP when requests arrive through a reverse proxy.

Why this is needed
------------------
Every browser-facing app now talks to Django through a same-origin Next.js
proxy, so REMOTE_ADDR is the proxy's address on every single request. Anything
keyed on IP therefore collapses into one bucket shared by the whole user base:
the login brute-force limit (10 attempts per IP per 5 minutes) would lock out
all users together after ten attempts from anyone, and anonymous throttles
would be meaningless. Both the protection and the availability break at once.

Why it is not just "read X-Forwarded-For"
-----------------------------------------
That header is client-supplied. If Django trusted it unconditionally, an
attacker could send a fresh value per request and never be rate limited at all,
which is strictly worse than the shared-bucket problem it fixes.

So the header is honoured only when the immediate peer is a configured trusted
proxy, and the chain is walked from the right, skipping trusted hops, to find
the first address the trusted infrastructure did not vouch for. Anything a
client prepends sits to the left of that and is ignored.
"""
import ipaddress

from django.conf import settings


def _networks(values):
    """Parse settings into networks, tolerating bare addresses and CIDR."""
    nets = []
    for raw in values:
        raw = str(raw).strip()
        if not raw:
            continue
        try:
            nets.append(ipaddress.ip_network(raw, strict=False))
        except ValueError:
            # A malformed entry must not silently widen trust, so it is
            # dropped rather than treated as a wildcard.
            continue
    return nets


def _is_trusted(address, nets):
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    return any(ip in net for net in nets)


class ClientIPMiddleware:
    """
    Rewrite REMOTE_ADDR to the real client address behind a trusted proxy.

    Placed ahead of everything that rate limits. Both DRF's throttles and
    django_ratelimit's key='ip' read REMOTE_ADDR, so correcting it once here
    fixes every IP-keyed control at the same time.

    With no TRUSTED_PROXY_IPS configured this is a no-op and REMOTE_ADDR stands
    as received, which is the safe default: sharing a bucket degrades service
    for everyone, but trusting a spoofable header removes the limit entirely.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.trusted = _networks(getattr(settings, 'TRUSTED_PROXY_IPS', []))

    def __call__(self, request):
        if self.trusted:
            resolved = self._client_ip(request)
            if resolved:
                # Kept for audit logs, which should record where the request
                # actually entered the system, not just who sent it.
                request.META['ORBI_PROXY_ADDR'] = request.META.get('REMOTE_ADDR')
                request.META['REMOTE_ADDR'] = resolved
        return self.get_response(request)

    def _client_ip(self, request):
        peer = request.META.get('REMOTE_ADDR', '')
        if not _is_trusted(peer, self.trusted):
            # Direct connection, or an untrusted hop. Believe nothing.
            return None

        forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if not forwarded:
            return None

        # Rightmost is the closest hop. Walk left past every address our own
        # infrastructure added; the first non-trusted one is the client.
        for candidate in reversed([part.strip() for part in forwarded.split(',')]):
            if not candidate:
                continue
            if _is_trusted(candidate, self.trusted):
                continue
            try:
                ipaddress.ip_address(candidate)
            except ValueError:
                # A garbage entry means the chain cannot be trusted further
                # left either, so stop rather than guess.
                return None
            return candidate
        return None

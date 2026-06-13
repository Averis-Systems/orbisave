from types import SimpleNamespace

from common.middleware import CountryMiddleware, get_current_country


def test_authenticated_user_country_takes_precedence_over_x_country_header():
    observed = {}

    def get_response(_request):
        observed["country"] = get_current_country()
        return object()

    request = SimpleNamespace(
        headers={"X-Country": "ghana"},
        user=SimpleNamespace(is_authenticated=True, country="kenya"),
    )

    CountryMiddleware(get_response)(request)

    assert observed["country"] == "kenya"


def test_anonymous_request_may_use_valid_x_country_header_for_public_context():
    observed = {}

    def get_response(_request):
        observed["country"] = get_current_country()
        return object()

    request = SimpleNamespace(
        headers={"X-Country": "rwanda"},
        user=SimpleNamespace(is_authenticated=False),
    )

    CountryMiddleware(get_response)(request)

    assert observed["country"] == "rwanda"

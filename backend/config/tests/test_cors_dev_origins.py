from django.conf import settings


def test_frontend_fallback_dev_port_is_allowed_for_cors():
    assert "http://localhost:3010" in settings.CORS_ALLOWED_ORIGINS
    assert "http://127.0.0.1:3010" in settings.CORS_ALLOWED_ORIGINS

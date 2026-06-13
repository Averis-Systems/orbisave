import re

import pytest
from django.core import mail
from django.test import override_settings
from rest_framework import status

from apps.accounts.models import User


@pytest.mark.django_db
def test_admin_registration_rejects_non_company_email(api_client):
    response = api_client.post(
        "/api/v1/admin-portal/auth/register/",
        {
            "email": "outsider@example.com",
            "full_name": "Outsider",
            "phone": "+254799000001",
            "password": "SecurePass123!",
            "portal": "manager",
            "country": "kenya",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert not User.objects.filter(email="outsider@example.com").exists()


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_admin_registration_requires_email_code_before_dashboard_tokens(api_client):
    response = api_client.post(
        "/api/v1/admin-portal/auth/register/",
        {
            "email": "country.admin@averissystems.com",
            "full_name": "Country Admin",
            "phone": "+254799000002",
            "password": "SecurePass123!",
            "portal": "manager",
            "country": "kenya",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert "access" not in response.data.get("data", {})
    assert len(mail.outbox) == 1

    user = User.objects.get(email="country.admin@averissystems.com")
    assert user.role == "platform_admin"
    assert user.country == "kenya"
    assert user.is_active is False

    login_response = api_client.post(
        "/api/v1/admin-portal/auth/login/",
        {"email": "country.admin@averissystems.com", "password": "SecurePass123!"},
        format="json",
    )
    assert login_response.status_code == status.HTTP_403_FORBIDDEN

    code = re.search(r"\b(\d{6})\b", mail.outbox[0].body).group(1)
    verify_response = api_client.post(
        "/api/v1/admin-portal/auth/verify-email/",
        {"email": "country.admin@averissystems.com", "code": code},
        format="json",
    )

    assert verify_response.status_code == status.HTTP_200_OK
    assert verify_response.data["data"]["user"]["role"] == "platform_admin"
    assert "access" in verify_response.data["data"]

    user.refresh_from_db()
    assert user.is_active is True


@pytest.mark.django_db
def test_only_owner_email_can_bootstrap_console_super_admin(api_client):
    response = api_client.post(
        "/api/v1/admin-portal/auth/register/",
        {
            "email": "other.admin@averissystems.com",
            "full_name": "Other Admin",
            "phone": "+254799000003",
            "password": "SecurePass123!",
            "portal": "console",
            "country": "",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert not User.objects.filter(email="other.admin@averissystems.com").exists()

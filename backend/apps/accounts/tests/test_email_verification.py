"""
Email OTP flow: signup email verification (apps/accounts/email_views.py).

Mirrors test_otp_flows.py's coverage of the phone flow: hashed storage,
attempt exhaustion, expiry, send throttling, enumeration-safety — plus the
one behavior that's unique to email verification: it blocks login entirely
(phone verification doesn't).
"""
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import EmailOTP, User

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])


@pytest.fixture
def unverified_user(db):
    return User.objects.create(
        email='unverified.email@test.orbisave.com',
        phone='+254700000098',
        full_name='Email Unverified Member',
        role='member',
        country='kenya',
        kyc_status='verified',
        phone_verified=True,
        email_verified=False,
        is_active=True,
        password=make_password('SecurePass123!'),
    )


def extract_code(sender):
    message = sender.call_args.kwargs['message']
    for part in message.replace('.', ' ').split():
        if part.isdigit() and len(part) == 6:
            return part
    raise AssertionError(f'No 6-digit code found in email message: {message!r}')


class TestRegistrationSendsCode:

    def test_register_issues_a_code_and_blocks_login_until_confirmed(self):
        client = APIClient()
        with patch('apps.accounts.email_views.send_mail') as sender:
            register = client.post('/api/v1/auth/register/', {
                'full_name': 'Fresh Signup', 'email': 'fresh@test.orbisave.com',
                'phone': '+254700000097', 'password': 'SecurePass123!',
                'country': 'kenya',
            }, format='json')
        assert register.status_code == 201, register.data
        assert sender.called

        login = client.post('/api/v1/auth/token/', {
            'email': 'fresh@test.orbisave.com', 'password': 'SecurePass123!',
        }, format='json')
        assert login.status_code == 403
        assert login.data['code'] == 'email_unverified'

        raw_code = extract_code(sender)
        confirm = client.post('/api/v1/auth/email/confirm/', {
            'email': 'fresh@test.orbisave.com', 'code': raw_code,
        }, format='json')
        assert confirm.status_code == 200, confirm.data
        assert 'access' in confirm.data['data']

        user = User.objects.get(email='fresh@test.orbisave.com')
        assert user.email_verified is True

        # Now the normal login path works too.
        login_again = client.post('/api/v1/auth/token/', {
            'email': 'fresh@test.orbisave.com', 'password': 'SecurePass123!',
        }, format='json')
        assert login_again.status_code == 200


class TestConfirmEmailOTP:

    def test_correct_code_verifies_and_returns_tokens(self, unverified_user):
        with patch('apps.accounts.email_views.send_mail') as sender:
            resend = APIClient().post('/api/v1/auth/email/resend/', {
                'email': unverified_user.email,
            }, format='json')
        assert resend.status_code == 200
        raw_code = extract_code(sender)

        # Stored hashed — the raw code must never be in the database.
        otp = EmailOTP.objects.get(user=unverified_user, purpose='email_verify', used=False)
        assert otp.code != raw_code
        assert raw_code not in otp.code

        confirm = APIClient().post('/api/v1/auth/email/confirm/', {
            'email': unverified_user.email, 'code': raw_code,
        }, format='json')
        assert confirm.status_code == 200, confirm.data
        assert 'access' in confirm.data['data'] and 'refresh' in confirm.data['data']
        unverified_user.refresh_from_db()
        assert unverified_user.email_verified is True

    def test_already_verified_is_idempotent(self, unverified_user):
        unverified_user.email_verified = True
        unverified_user.save(update_fields=['email_verified'])
        response = APIClient().post('/api/v1/auth/email/confirm/', {
            'email': unverified_user.email, 'code': '000000',
        }, format='json')
        assert response.status_code == 200
        assert 'already verified' in response.data['message'].lower()

    def test_wrong_code_increments_attempts_and_exhausts(self, unverified_user):
        with patch('apps.accounts.email_views.send_mail'):
            APIClient().post('/api/v1/auth/email/resend/', {'email': unverified_user.email}, format='json')

        client = APIClient()
        for _ in range(5):
            response = client.post('/api/v1/auth/email/confirm/', {
                'email': unverified_user.email, 'code': '000000',
            }, format='json')
            assert response.status_code == 400

        otp = EmailOTP.objects.get(user=unverified_user, purpose='email_verify', used=False)
        assert otp.attempt_count == 5
        response = client.post('/api/v1/auth/email/confirm/', {
            'email': unverified_user.email, 'code': '123456',
        }, format='json')
        assert response.status_code == 400
        assert 'attempts' in response.data['error'].lower()

    def test_expired_code_rejected(self, unverified_user):
        with patch('apps.accounts.email_views.send_mail') as sender:
            APIClient().post('/api/v1/auth/email/resend/', {'email': unverified_user.email}, format='json')
        raw_code = extract_code(sender)
        EmailOTP.objects.filter(user=unverified_user).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        response = APIClient().post('/api/v1/auth/email/confirm/', {
            'email': unverified_user.email, 'code': raw_code,
        }, format='json')
        assert response.status_code == 400
        assert 'expired' in response.data['error'].lower()

    def test_unknown_email_gets_generic_error_not_404(self):
        response = APIClient().post('/api/v1/auth/email/confirm/', {
            'email': 'nobody@test.orbisave.com', 'code': '123456',
        }, format='json')
        assert response.status_code == 400
        assert 'invalid or has expired' in response.data['error'].lower()


class TestResendEmailOTP:

    def test_send_throttle_caps_hourly_requests(self, unverified_user):
        client = APIClient()
        with patch('apps.accounts.email_views.send_mail'):
            for _ in range(3):
                resp = client.post('/api/v1/auth/email/resend/', {'email': unverified_user.email}, format='json')
                assert resp.status_code == 200
            # Fourth request within the hour is silently suppressed, not an
            # error — the endpoint is enumeration-safe, so it still returns 200.
            fourth = client.post('/api/v1/auth/email/resend/', {'email': unverified_user.email}, format='json')
        assert fourth.status_code == 200
        assert EmailOTP.objects.filter(user=unverified_user).count() == 3

    def test_new_request_invalidates_prior_code(self, unverified_user):
        with patch('apps.accounts.email_views.send_mail') as first_sender:
            APIClient().post('/api/v1/auth/email/resend/', {'email': unverified_user.email}, format='json')
        first_code = extract_code(first_sender)

        with patch('apps.accounts.email_views.send_mail'):
            APIClient().post('/api/v1/auth/email/resend/', {'email': unverified_user.email}, format='json')

        response = APIClient().post('/api/v1/auth/email/confirm/', {
            'email': unverified_user.email, 'code': first_code,
        }, format='json')
        assert response.status_code == 400  # old code is dead

    def test_resend_is_enumeration_safe(self):
        """Response shape must be identical whether or not the email exists."""
        with patch('apps.accounts.email_views.send_mail'):
            unknown = APIClient().post('/api/v1/auth/email/resend/', {
                'email': 'nobody@test.orbisave.com',
            }, format='json')
        assert unknown.status_code == 200
        assert 'if that email' in unknown.data['message'].lower()

    def test_resend_for_already_verified_email_sends_nothing(self, unverified_user):
        unverified_user.email_verified = True
        unverified_user.save(update_fields=['email_verified'])
        with patch('apps.accounts.email_views.send_mail') as sender:
            response = APIClient().post('/api/v1/auth/email/resend/', {
                'email': unverified_user.email,
            }, format='json')
        assert response.status_code == 200
        assert not sender.called

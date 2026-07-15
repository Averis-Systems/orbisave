"""
SMS OTP flows: signup phone verification + password reset.

Covers the security properties, not just the happy paths: hashed storage,
attempt exhaustion, expiry, purpose scoping, enumeration-safety, send
throttling, and the phone-verified gates on money-adjacent actions.
"""
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import PhoneOTP, User

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])


@pytest.fixture
def unverified_user(db):
    from django.contrib.auth.hashers import make_password
    return User.objects.create(
        email='unverified@test.orbisave.com',
        phone='+254700000099',
        full_name='Unverified Member',
        role='member',
        country='kenya',
        kyc_status='verified',
        phone_verified=False,
        is_active=True,
        password=make_password('SecurePass123!'),
    )


def request_code(user):
    client = APIClient()
    client.force_authenticate(user=user)
    with patch('apps.accounts.otp_views.send_sms') as sender:
        sender.return_value = {'channel': 'logged'}
        response = client.post('/api/v1/auth/otp/request/')
    return client, response, sender


def extract_raw_code(sender):
    message = sender.call_args.args[1]
    for part in message.replace('.', ' ').split():
        if part.isdigit() and len(part) == 6:
            return part
    raise AssertionError(f'No 6-digit code found in SMS message: {message!r}')


class TestPhoneVerification:

    def test_request_and_confirm_marks_phone_verified(self, unverified_user):
        client, response, sender = request_code(unverified_user)
        assert response.status_code == 200, response.data
        raw_code = extract_raw_code(sender)

        # Stored hashed — the raw code must never be in the database.
        otp = PhoneOTP.objects.get(user=unverified_user, purpose='phone_verify', used=False)
        assert otp.code != raw_code
        assert raw_code not in otp.code

        confirm = client.post('/api/v1/auth/otp/confirm/', {'code': raw_code}, format='json')
        assert confirm.status_code == 200, confirm.data
        unverified_user.refresh_from_db()
        assert unverified_user.phone_verified is True

    def test_wrong_code_increments_attempts_and_exhausts(self, unverified_user):
        client, _, _ = request_code(unverified_user)
        for _ in range(5):
            response = client.post('/api/v1/auth/otp/confirm/', {'code': '000000'}, format='json')
            assert response.status_code == 400

        otp = PhoneOTP.objects.get(user=unverified_user, purpose='phone_verify', used=False)
        assert otp.attempt_count == 5
        # Even the right structure now fails — code is exhausted.
        response = client.post('/api/v1/auth/otp/confirm/', {'code': '123456'}, format='json')
        assert response.status_code == 400
        assert 'attempts' in response.data['error'].lower()

    def test_expired_code_rejected(self, unverified_user):
        client, _, sender = request_code(unverified_user)
        raw_code = extract_raw_code(sender)
        PhoneOTP.objects.filter(user=unverified_user).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        response = client.post('/api/v1/auth/otp/confirm/', {'code': raw_code}, format='json')
        assert response.status_code == 400
        assert 'expired' in response.data['error'].lower()

    def test_send_throttle_caps_hourly_requests(self, unverified_user):
        client = APIClient()
        client.force_authenticate(user=unverified_user)
        with patch('apps.accounts.otp_views.send_sms', return_value={'channel': 'logged'}):
            for _ in range(3):
                assert client.post('/api/v1/auth/otp/request/').status_code == 200
            throttled = client.post('/api/v1/auth/otp/request/')
        assert throttled.status_code == 429

    def test_new_request_invalidates_prior_code(self, unverified_user):
        client, _, first_sender = request_code(unverified_user)
        first_code = extract_raw_code(first_sender)
        with patch('apps.accounts.otp_views.send_sms', return_value={'channel': 'logged'}) as second_sender:
            client.post('/api/v1/auth/otp/request/')
        response = client.post('/api/v1/auth/otp/confirm/', {'code': first_code}, format='json')
        assert response.status_code == 400  # old code is dead


class TestPasswordReset:

    def test_full_reset_flow(self, unverified_user):
        client = APIClient()
        with patch('apps.accounts.otp_views.send_sms', return_value={'channel': 'logged'}) as sender:
            response = client.post(
                '/api/v1/auth/password-reset/request/',
                {'phone': unverified_user.phone}, format='json',
            )
        assert response.status_code == 200
        raw_code = extract_raw_code(sender)

        confirm = client.post('/api/v1/auth/password-reset/confirm/', {
            'phone': unverified_user.phone,
            'code': raw_code,
            'new_password': 'BrandNewPass456!',
        }, format='json')
        assert confirm.status_code == 200, confirm.data

        unverified_user.refresh_from_db()
        assert unverified_user.check_password('BrandNewPass456!')

    def test_request_is_enumeration_safe(self):
        client = APIClient()
        with patch('apps.accounts.otp_views.send_sms', return_value={'channel': 'logged'}):
            existing_shape = client.post(
                '/api/v1/auth/password-reset/request/',
                {'phone': '+254700999888'}, format='json',
            )
        assert existing_shape.status_code == 200
        assert 'If an account exists' in existing_shape.data['message']

    def test_verification_code_cannot_reset_password(self, unverified_user):
        # Purpose scoping: a phone_verify code must not work for reset.
        client, _, sender = request_code(unverified_user)
        raw_code = extract_raw_code(sender)
        response = APIClient().post('/api/v1/auth/password-reset/confirm/', {
            'phone': unverified_user.phone,
            'code': raw_code,
            'new_password': 'BrandNewPass456!',
        }, format='json')
        assert response.status_code == 400
        unverified_user.refresh_from_db()
        assert unverified_user.check_password('SecurePass123!')

    def test_weak_password_rejected(self, unverified_user):
        client = APIClient()
        with patch('apps.accounts.otp_views.send_sms', return_value={'channel': 'logged'}) as sender:
            client.post('/api/v1/auth/password-reset/request/', {'phone': unverified_user.phone}, format='json')
        raw_code = extract_raw_code(sender)
        response = client.post('/api/v1/auth/password-reset/confirm/', {
            'phone': unverified_user.phone,
            'code': raw_code,
            'new_password': '123',
        }, format='json')
        assert response.status_code == 400


class TestPhoneVerifiedGates:

    def test_unverified_phone_cannot_create_group(self, unverified_user, settings):
        # Phone verification enforcement is off by default (no Africa's
        # Talking budget yet) — this test targets the gate logic itself, so
        # it turns enforcement on for its own scope.
        settings.PHONE_VERIFICATION_ENFORCED = True
        client = APIClient()
        client.force_authenticate(user=unverified_user)
        response = client.post('/api/v1/groups/', {
            'name': 'Gate Test Chama',
            'country': 'kenya',
            'max_members': 10,
            'contribution_amount': '500.00',
            'contribution_frequency': 'weekly',
            'contribution_day': 1,
            'rotation_savings_pct': 70,
            'loan_pool_pct': 30,
        }, format='json')
        assert response.status_code == 403
        assert response.data['code'] == 'phone_unverified'

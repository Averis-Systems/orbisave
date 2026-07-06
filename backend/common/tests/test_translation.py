"""
Translation layer: language resolution, Google-API round trip with caching,
graceful degradation (delivery never blocks), and registration capture.
"""
from unittest.mock import patch

import pytest
import responses
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.admin_portal.models import SystemConfiguration
from common.encryption import encrypt_value
from common.translation import (
    GOOGLE_TRANSLATE_ENDPOINT,
    default_languages_for_country,
    resolve_user_language,
    translate,
    translate_for_user,
)

pytestmark = pytest.mark.django_db


def make_user(languages=None, country='kenya'):
    return User.objects.create(
        email=f'lang-{(languages or ["x"])[0]}@test.orbisave.com',
        phone=f'+2547{abs(hash(str(languages))) % 10**8:08d}',
        full_name='Lang Tester',
        country=country,
        languages=languages or [],
        password=make_password('SecurePass123!'),
    )


def configure_api_key():
    SystemConfiguration.objects.create(
        key='google_translate_api_key',
        value=encrypt_value('test-google-key'),
        category='api_data',
        is_encrypted=True,
    )


class TestLanguageResolution:

    def test_first_supported_selected_language_wins(self):
        user = make_user(languages=['sw', 'en'])
        assert resolve_user_language(user) == 'sw'

    def test_unsupported_choices_fall_through_to_next(self):
        user = make_user(languages=['zz', 'rw'])
        assert resolve_user_language(user) == 'rw'

    def test_no_choice_falls_back_to_country_default(self):
        assert resolve_user_language(make_user(languages=[], country='rwanda')) == 'en'
        assert default_languages_for_country('rwanda') == ['en', 'rw']
        assert default_languages_for_country('ghana') == ['en', 'tw']
        assert default_languages_for_country(None) == ['en', 'sw']


class TestTranslateService:

    @responses.activate
    def test_translates_and_caches(self):
        configure_api_key()
        responses.add(
            responses.POST, GOOGLE_TRANSLATE_ENDPOINT,
            json={'data': {'translations': [{'translatedText': 'Karibu OrbiSave'}]}},
            status=200,
        )
        first = translate('Welcome to OrbiSave', 'sw')
        second = translate('Welcome to OrbiSave', 'sw')  # cache hit — no 2nd call

        assert first == 'Karibu OrbiSave'
        assert second == 'Karibu OrbiSave'
        assert len(responses.calls) == 1
        assert responses.calls[0].request.params['key'] == 'test-google-key'

    def test_english_target_passes_through_without_api(self):
        assert translate('Hello', 'en') == 'Hello'

    def test_missing_key_returns_original(self):
        assert translate('Hello there', 'sw') == 'Hello there'

    @responses.activate
    def test_api_failure_never_blocks_delivery(self):
        configure_api_key()
        responses.add(responses.POST, GOOGLE_TRANSLATE_ENDPOINT, status=500)
        assert translate('Your code is 123456', 'rw') == 'Your code is 123456'

    @responses.activate
    def test_translate_for_user_targets_their_language(self):
        configure_api_key()
        responses.add(
            responses.POST, GOOGLE_TRANSLATE_ENDPOINT,
            json={'data': {'translations': [{'translatedText': 'Murakoze'}]}},
            status=200,
        )
        user = make_user(languages=['rw', 'en'])
        assert translate_for_user('Thank you', user) == 'Murakoze'
        body = responses.calls[0].request.body
        assert b'"target": "rw"' in body or b'"target":"rw"' in body


class TestRegistrationLanguageCapture:

    def test_register_accepts_and_stores_choices(self):
        response = APIClient().post('/api/v1/auth/register/', {
            'full_name': 'Lugha Mbili', 'email': 'lugha@test.orbisave.com',
            'phone': '+254700556677', 'password': 'SecurePass123!',
            'country': 'kenya', 'languages': ['sw', 'en'],
        }, format='json')
        assert response.status_code == 201, response.data
        user = User.objects.get(email='lugha@test.orbisave.com')
        assert user.languages == ['sw', 'en']

    def test_register_rejects_single_language(self):
        response = APIClient().post('/api/v1/auth/register/', {
            'full_name': 'One Lang', 'email': 'onelang@test.orbisave.com',
            'phone': '+254700556688', 'password': 'SecurePass123!',
            'country': 'kenya', 'languages': ['en'],
        }, format='json')
        assert response.status_code == 400
        assert 'at least 2' in str(response.data)

    def test_register_without_languages_gets_country_default(self):
        response = APIClient().post('/api/v1/auth/register/', {
            'full_name': 'Default Lang', 'email': 'deflang@test.orbisave.com',
            'phone': '+254700556699', 'password': 'SecurePass123!',
            'country': 'rwanda',
        }, format='json')
        assert response.status_code == 201, response.data
        user = User.objects.get(email='deflang@test.orbisave.com')
        assert user.languages == ['en', 'rw']


class TestLocalizedDelivery:

    @responses.activate
    def test_otp_sms_is_sent_in_users_language(self):
        configure_api_key()

        def swahili(request):
            import json as jsonlib
            payload = jsonlib.loads(request.body)
            return (200, {}, jsonlib.dumps({
                'data': {'translations': [{'translatedText': f"SW[{payload['q']}]"}]}
            }))
        responses.add_callback(responses.POST, GOOGLE_TRANSLATE_ENDPOINT, callback=swahili)

        user = make_user(languages=['sw', 'en'])
        client = APIClient()
        client.force_authenticate(user=user)
        with patch('apps.accounts.otp_views.send_sms', return_value={'channel': 'logged'}) as sender:
            resp = client.post('/api/v1/auth/otp/request/')

        assert resp.status_code == 200, resp.data
        sent_message = sender.call_args.args[1]
        assert sent_message.startswith('SW[')  # translated before delivery
        assert 'verification code' in sent_message  # original English inside the marker

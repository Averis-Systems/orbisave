import pytest
from decimal import Decimal
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import User


pytestmark = pytest.mark.django_db


@pytest.fixture
def super_admin():
    return User.objects.create(
        email='policy-owner@test.orbisave.com',
        phone='+254799000003',
        full_name='Policy Owner',
        role='super_admin',
        country='kenya',
        is_active=True,
        password=make_password('SecurePass123!'),
    )


def test_super_admin_can_create_country_policy_cap(super_admin):
    client = APIClient()
    client.force_authenticate(user=super_admin)

    response = client.post(
        '/api/v1/admin-portal/superadmin/country-policies/',
        {
            'country': 'kenya',
            'currency': 'KES',
            'central_bank_name': 'Central Bank of Kenya',
            'max_loan_interest_rate_monthly': '8.00',
            'recommended_loan_interest_rate_monthly': '3.00',
            'source_url': 'https://www.centralbank.go.ke/',
            'notes': 'Use a conservative cap for internal group lending.',
            'is_active': True,
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['country'] == 'kenya'
    assert Decimal(response.data['max_loan_interest_rate_monthly']) == Decimal('8.00')
    assert response.data['updated_by_name'] == 'Policy Owner'


def test_super_admin_can_update_country_policy_cap(super_admin):
    client = APIClient()
    client.force_authenticate(user=super_admin)

    create_response = client.post(
        '/api/v1/admin-portal/superadmin/country-policies/',
        {
            'country': 'rwanda',
            'currency': 'RWF',
            'central_bank_name': 'National Bank of Rwanda',
            'max_loan_interest_rate_monthly': '7.00',
            'recommended_loan_interest_rate_monthly': '2.50',
            'is_active': True,
        },
        format='json',
    )

    response = client.patch(
        f"/api/v1/admin-portal/superadmin/country-policies/{create_response.data['id']}/",
        {'max_loan_interest_rate_monthly': '6.50'},
        format='json',
    )

    assert response.status_code == 200
    assert Decimal(response.data['max_loan_interest_rate_monthly']) == Decimal('6.50')

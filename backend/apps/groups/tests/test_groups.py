import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from apps.accounts.models import User
from apps.groups.models import Group, GroupMember
from django.core.cache import cache

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client):
    user = User.objects.create_user(email='test@example.com', phone='+1234', password='password123', full_name='Test')
    api_client.force_authenticate(user=user)
    api_client.user = user
    return api_client

@pytest.fixture
def group(auth_client):
    # Setup standard group
    Group.objects.create(
        name="Test Collective",
        description="Demo",
        country="kenya",
        currency="KES",
        max_members=10,
        contribution_amount=100.0,
        contribution_frequency='monthly',
        contribution_day=1,
        rotation_savings_pct=80.0,
        loan_pool_pct=20.0,
        max_loan_multiplier=2.0,
        loan_term_weeks=4,
        loan_interest_rate_monthly=5.0,
        chairperson=auth_client.user
    )
    grp = Group.objects.first()
    GroupMember.objects.create(group=grp, member=auth_client.user, role='chairperson', rotation_position=1)
    return grp

@pytest.mark.django_db
class TestGroupRBAC:
    def test_group_creation(self, auth_client):
        response = auth_client.post('/api/v1/groups/', {
            "name": "New Scale Group",
            "country": "kenya",
            "max_members": 50,
            "contribution_amount": 500,
            "contribution_frequency": "weekly",
            "contribution_day": 15,
            "rotation_savings_pct": 70,
            "loan_pool_pct": 30,
            "max_loan_multiplier": 3,
            "loan_term_weeks": 12,
            "loan_interest_rate_monthly": 2.5,
            "rotation_method": "sequential"
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify user was fundamentally upgraded to Chairperson logic
        auth_client.user.refresh_from_db()
        assert auth_client.user.role == 'chairperson'

    def test_unauthorized_member_cannot_manage_group(self, auth_client, group):
        # Create secondary unauthorized user
        rogue_user = User.objects.create_user(email='rogue@example.com', phone='+999', password='pw', full_name='Rogue User')
        GroupMember.objects.create(group=group, member=rogue_user, role='member', rotation_position=2)
        
        rogue_client = APIClient()
        rogue_client.force_authenticate(user=rogue_user)
        
        # Trying to pause the group must fail structurally
        response = rogue_client.post(f'/api/v1/groups/{group.id}/pause/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "You do not have permission" in str(response.data)

    def test_redis_wallet_cache_flow(self, auth_client, group):
        cache.clear() # Simulate empty redis
        response = auth_client.get(f'/api/v1/groups/{group.id}/wallet/')
        assert response.status_code == status.HTTP_200_OK
        
        # Values computed dynamically
        assert response.data['data']['total'] == 0.0
        
        # Assert Cache Miss triggered Set
        cache_key = f"group_wallet_{group.id}"
        assert cache.get(cache_key) is not None
        assert cache.get(cache_key)['currency'] == 'KES'

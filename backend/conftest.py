"""
Shared pytest fixtures for the OrbiSave backend test suite.
All fixtures use Django's test database and are scoped to the function level
unless otherwise specified.
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient


# ── User Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    """Standard active member user."""
    from apps.accounts.models import User
    from django.contrib.auth.hashers import make_password
    return User.objects.create(
        email='member@test.orbisave.com',
        phone='+254700000001',
        full_name='Test Member',
        role='member',
        country='kenya',
        kyc_status='verified',
        is_active=True,
        password=make_password('SecurePass123!'),
        transaction_pin=make_password('1234'),
    )


@pytest.fixture
def chairperson(db):
    """Chairperson user with verified KYC."""
    from apps.accounts.models import User
    from django.contrib.auth.hashers import make_password
    return User.objects.create(
        email='chair@test.orbisave.com',
        phone='+254700000002',
        full_name='Test Chairperson',
        role='chairperson',
        country='kenya',
        kyc_status='verified',
        is_active=True,
        password=make_password('SecurePass123!'),
        transaction_pin=make_password('1234'),
    )


@pytest.fixture
def treasurer(db):
    """Treasurer user."""
    from apps.accounts.models import User
    from django.contrib.auth.hashers import make_password
    return User.objects.create(
        email='treasurer@test.orbisave.com',
        phone='+254700000003',
        full_name='Test Treasurer',
        role='treasurer',
        country='kenya',
        kyc_status='verified',
        is_active=True,
        password=make_password('SecurePass123!'),
        transaction_pin=make_password('1234'),
    )


@pytest.fixture
def auth_user(user):
    """Alias kept for backwards compatibility with existing tests."""
    return user


# ── Group Fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def group(db, chairperson):
    """Active test group with chairperson pre-enrolled."""
    from apps.groups.models import Group, GroupMember
    grp = Group.objects.create(
        name='Test Collective KE',
        description='Automated test group',
        country='kenya',
        currency='KES',
        max_members=10,
        contribution_amount=Decimal('5000.00'),
        contribution_frequency='monthly',
        contribution_day=1,
        rotation_savings_pct=Decimal('70'),
        loan_pool_pct=Decimal('30'),
        max_loan_multiplier=Decimal('3'),
        loan_term_weeks=12,
        loan_interest_rate_monthly=Decimal('5.00'),
        rotation_method='sequential',
        status='active',
        chairperson=chairperson,
    )
    GroupMember.objects.create(
        group=grp, member=chairperson, role='chairperson',
        status='active', rotation_position=1,
    )
    return grp


@pytest.fixture
def group_member(db, group, user):
    """Regular member enrolled in the test group."""
    from apps.groups.models import GroupMember
    return GroupMember.objects.create(
        group=group, member=user, role='member',
        status='active', rotation_position=2,
    )


@pytest.fixture
def group_with_treasurer(db, group, treasurer):
    """Test group with a treasurer enrolled."""
    from apps.groups.models import GroupMember, Group
    GroupMember.objects.create(
        group=group, member=treasurer, role='treasurer',
        status='active', rotation_position=3,
    )
    Group.objects.filter(pk=group.pk).update(treasurer=treasurer)
    group.refresh_from_db()
    return group


# ── Contribution Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def contribution_pending(db, group, user, group_member):
    """A contribution in 'initiated' state awaiting webhook confirmation."""
    from apps.contributions.models import Contribution
    return Contribution.objects.create(
        group=group,
        member=user,
        amount=Decimal('5000.00'),
        currency='KES',
        method='mpesa',
        phone=user.phone,
        status='initiated',
        platform_reference='TEST-REF-001',
        provider_reference='MPESA-TEST-001',
        scheduled_date=timezone.now().date(),
    )


@pytest.fixture
def contribution_confirmed(db, group, user, group_member):
    """A confirmed contribution (webhook already processed)."""
    from apps.contributions.models import Contribution
    return Contribution.objects.create(
        group=group,
        member=user,
        amount=Decimal('5000.00'),
        currency='KES',
        method='mpesa',
        phone=user.phone,
        status='confirmed',
        platform_reference='TEST-REF-002',
        provider_reference='MPESA-TEST-002',
        scheduled_date=timezone.now().date(),
        confirmed_at=timezone.now(),
    )


# ── Loan Fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture
def loan_pending_chair(db, group, user, group_member):
    """Loan at pending_chair stage (just submitted)."""
    from apps.loans.models import Loan
    return Loan.objects.create(
        group=group,
        borrower=user,
        amount=Decimal('10000.00'),
        currency='KES',
        interest_rate_monthly=Decimal('5.00'),
        term_weeks=12,
        purpose='Business expansion',
        status='pending_chair',
    )


@pytest.fixture
def approved_loan(db, group, user, group_member, chairperson):
    """Fully approved loan (past all approval stages)."""
    from apps.loans.models import Loan
    return Loan.objects.create(
        group=group,
        borrower=user,
        amount=Decimal('10000.00'),
        currency='KES',
        interest_rate_monthly=Decimal('5.00'),
        term_weeks=12,
        purpose='Business expansion',
        status='approved',
        chair_approved_by=chairperson,
        chair_approved_at=timezone.now(),
    )


# ── API Client Fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def chair_client(chairperson):
    client = APIClient()
    client.force_authenticate(user=chairperson)
    return client


@pytest.fixture
def member_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client

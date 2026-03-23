import pytest
import uuid
from decimal import Decimal
from apps.accounts.models import User
from apps.groups.models import Group, GroupMember
from apps.contributions.models import Contribution

@pytest.fixture
def auth_user(db):
    user = User.objects.create_user(
        email='contrib@example.com',
        phone='+254711111111',
        password='password123',
        full_name='Contrib User'
    )
    return user

@pytest.fixture
def group(db, auth_user):
    group = Group.objects.create(
        name="Contrib Scale Group",
        country="kenya",
        currency="KES",
        max_members=10,
        contribution_amount=Decimal("5000.00"),
        contribution_frequency='monthly',
        contribution_day=1,
        rotation_savings_pct=80.0,
        loan_pool_pct=20.0,
        max_loan_multiplier=2.0,
        loan_term_weeks=4,
        loan_interest_rate_monthly=5.0,
        chairperson=auth_user
    )
    GroupMember.objects.create(group=group, member=auth_user, role='chairperson', rotation_position=1)
    return group

import datetime

@pytest.fixture
def contribution_pending(db, group, auth_user):
    return Contribution.objects.create(
        group=group,
        member=auth_user,
        amount=Decimal("5000.00"),
        currency=group.currency,
        method='mpesa',
        mobile_number='+254711111111',
        status='initiated',
        scheduled_date=datetime.date.today(),
        provider_reference=f"TRANS-{uuid.uuid4().hex[:8].upper()}",
        platform_reference=f"PLT-TEST-{uuid.uuid4().hex[:8].upper()}"
    )

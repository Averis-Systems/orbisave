import os
import django
from decimal import Decimal
from dotenv import load_dotenv

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
# Ensure we are in the backend directory for relative paths in settings
os.chdir(r'c:\Users\ADMIN\Desktop\Orbisave App\orbisave\backend')
load_dotenv()
django.setup()

from apps.groups.models import Group
from apps.accounts.models import User
from django.db import connections

def test_group_creation():
    try:
        # 1. Get or create a test user in the default DB
        user, created = User.objects.using('default').get_or_create(
            email='testchair_internal@example.com',
            defaults={
                'full_name': 'Test Chairperson',
                'phone': '+254700000001',
                'role': 'chairperson',
                'country': 'kenya'
            }
        )
        if created:
            user.set_password('Password123!')
            user.save(using='default')
        
        print(f"User: {user.id}, role: {user.role}, country: {user.country}")

        # 2. Try to create a group in the kenya DB
        # We manually set the country context for the router
        from common.middleware import set_current_country
        set_current_country('kenya')

        group = Group(
            name='Test Group Internal',
            country='kenya',
            chairperson=user,
            contribution_amount=Decimal('1000.00'),
            contribution_frequency='monthly',
            contribution_day=1,
            rotation_savings_pct=Decimal('70.00'),
            loan_pool_pct=Decimal('30.00'),
            currency='KES'
        )
        
        print("Attempting to save group...")
        group.save()
        print(f"Group created successfully: {group.id}")

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_group_creation()

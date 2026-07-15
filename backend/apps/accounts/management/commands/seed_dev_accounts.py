"""
Seed one working account per portal for local UI review — not a production
bootstrap tool. Creates/resets a super_admin (Console), a platform_admin
(Manager), and a member (frontend), all pre-verified (email_verified,
phone_verified, is_active=True) so login works immediately with no OTP
detour. Safe to re-run: existing rows are updated in place, not duplicated.

    python manage.py seed_dev_accounts
"""
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from apps.accounts.models import User

DEV_PASSWORD = 'OrbiSave2026!'

ACCOUNTS = [
    {
        'email': 'emanuel@averissystems.com',
        'phone': '+254700000001',
        'full_name': 'Emanuel',
        'role': 'super_admin',
        'portal': 'Console',
    },
    {
        'email': 'manager@averissystems.com',
        'phone': '+254700000002',
        'full_name': 'Manager Admin',
        'role': 'platform_admin',
        'portal': 'Manager',
    },
    {
        'email': 'member@orbisave.com',
        'phone': '+254700000003',
        'full_name': 'Demo Member',
        'role': 'member',
        'portal': 'Member app',
    },
]


class Command(BaseCommand):
    help = "Seed one pre-verified account per portal (Console/Manager/member app) for local UI review."

    def handle(self, *args, **options):
        rows = []
        for acct in ACCOUNTS:
            user, created = User.objects.update_or_create(
                email=acct['email'],
                defaults={
                    'phone': acct['phone'],
                    'full_name': acct['full_name'],
                    'role': acct['role'],
                    'country': 'kenya',
                    'kyc_status': 'verified',
                    'is_active': True,
                    'email_verified': True,
                    'phone_verified': True,
                    'password': make_password(DEV_PASSWORD),
                    'languages': ['en', 'sw'],
                    'next_of_kin_name': 'Next of Kin',
                    'next_of_kin_phone': '+254700099999',
                },
            )
            rows.append((acct['portal'], acct['email'], 'created' if created else 'reset'))

        self.stdout.write(self.style.SUCCESS(f"Dev password for all three: {DEV_PASSWORD}\n"))
        for portal, email, status in rows:
            self.stdout.write(f"  {portal:<12} {email:<32} ({status})")

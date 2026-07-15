"""
Email verification is a new gate on login. Without this, every account
created before this feature shipped would default to email_verified=False
and be locked out — nobody who already has an account ever went through a
flow that could have verified it. Grandfather everyone who existed before
this migration runs; only accounts created after this ships go through the
new email OTP flow.
"""
from django.db import migrations


def grandfather_existing_users(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email_verified=False).update(email_verified=True)


def noop_reverse(apps, schema_editor):
    # Not reversible by design — we can't know which users were
    # grandfathered vs. genuinely unverified after the fact.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_user_email_verified_emailotp'),
    ]

    operations = [
        migrations.RunPython(grandfather_existing_users, noop_reverse),
    ]

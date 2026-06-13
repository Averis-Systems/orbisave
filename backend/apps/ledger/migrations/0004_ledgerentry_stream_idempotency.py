# Generated manually during P0 ledger hardening on 2026-06-12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ledger', '0003_ledgerentry_previous_hash_alter_ledgerentry_member_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ledgerentry',
            name='account_stream',
            field=models.CharField(choices=[('rotation', 'Rotation Trust'), ('savings', 'Mandatory Savings'), ('loaning', 'Loaning'), ('company_revenue', 'Company Revenue'), ('suspense', 'Suspense'), ('provider_settlement', 'Provider Settlement')], default='rotation', max_length=40),
        ),
        migrations.AddField(
            model_name='ledgerentry',
            name='idempotency_key',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='ledgerentry',
            name='source_system',
            field=models.CharField(default='orbisave', max_length=50),
        ),
    ]

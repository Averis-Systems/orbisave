# Generated manually during P0 reconciliation hardening on 2026-06-12

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contributions', '0005_contribution_disputed_status'),
        ('groups', '0008_group_mandatory_savings_pending_gate'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ledger', '0004_ledgerentry_stream_idempotency'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReconciliationRun',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('country', models.CharField(max_length=10)),
                ('provider_code', models.CharField(max_length=40)),
                ('account_stream', models.CharField(choices=[('rotation', 'Rotation Trust'), ('savings', 'Mandatory Savings'), ('loaning', 'Loaning'), ('company_revenue', 'Company Revenue'), ('suspense', 'Suspense'), ('provider_settlement', 'Provider Settlement')], max_length=40)),
                ('account_number', models.CharField(max_length=100)),
                ('business_date', models.DateField()),
                ('source', models.CharField(default='daily_bank_statement', max_length=80)),
                ('expected_closing_balance', models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ('observed_closing_balance', models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ('status', models.CharField(choices=[('running', 'Running'), ('matched', 'Matched'), ('needs_review', 'Needs Review'), ('failed', 'Failed')], default='running', max_length=20)),
                ('metadata', models.JSONField(blank=True, default=dict)),
            ],
            options={
                'db_table': 'ledger_reconciliation_run',
                'ordering': ['-business_date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ReconciliationItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account_stream', models.CharField(choices=[('rotation', 'Rotation Trust'), ('savings', 'Mandatory Savings'), ('loaning', 'Loaning'), ('company_revenue', 'Company Revenue'), ('suspense', 'Suspense'), ('provider_settlement', 'Provider Settlement')], max_length=40)),
                ('issue_type', models.CharField(choices=[('amount_mismatch', 'Amount Mismatch'), ('closing_balance_mismatch', 'Closing Balance Mismatch'), ('missing_bank_record', 'Missing Bank Record'), ('missing_provider_callback', 'Missing Provider Callback'), ('orphan_bank_transaction', 'Orphan Bank Transaction'), ('duplicate_reference', 'Duplicate Reference'), ('signature_mismatch', 'Signature Mismatch')], max_length=40)),
                ('status', models.CharField(choices=[('open', 'Open'), ('investigating', 'Investigating'), ('resolved', 'Resolved'), ('escalated', 'Escalated')], default='open', max_length=20)),
                ('severity', models.CharField(choices=[('green', 'Green'), ('orange', 'Orange'), ('red', 'Red')], default='orange', max_length=10)),
                ('reference', models.CharField(max_length=255)),
                ('provider_reference', models.CharField(blank=True, max_length=255)),
                ('bank_reference', models.CharField(blank=True, max_length=255)),
                ('expected_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ('observed_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ('currency', models.CharField(blank=True, max_length=5)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('group', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='reconciliation_items', to='groups.group')),
                ('related_contribution', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='reconciliation_items', to='contributions.contribution')),
                ('resolved_by', models.ForeignKey(blank=True, db_constraint=False, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='resolved_reconciliation_items', to=settings.AUTH_USER_MODEL)),
                ('run', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='items', to='ledger.reconciliationrun')),
            ],
            options={
                'db_table': 'ledger_reconciliation_item',
                'ordering': ['-created_at'],
            },
        ),
    ]

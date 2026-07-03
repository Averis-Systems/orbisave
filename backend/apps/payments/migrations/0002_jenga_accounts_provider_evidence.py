# Generated manually for Jenga provider/account hardening on 2026-06-20

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_bank_provider'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentProviderAccount',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('label', models.CharField(max_length=120)),
                ('account_type', models.CharField(choices=[('collection', 'Collection'), ('payout', 'Payout'), ('trust', 'Trust / Custody'), ('settlement', 'Settlement / Clearing'), ('wallet', 'Jenga Wallet'), ('reconciliation', 'Reconciliation'), ('fee', 'Fee / Revenue')], max_length=30)),
                ('account_number', models.CharField(max_length=100)),
                ('account_name', models.CharField(blank=True, max_length=160)),
                ('country_code', models.CharField(default='KE', max_length=5)),
                ('currency', models.CharField(default='KES', max_length=5)),
                ('bank_code', models.CharField(blank=True, max_length=20)),
                ('branch_code', models.CharField(blank=True, max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('is_default_for_collections', models.BooleanField(default=False)),
                ('is_default_for_disbursements', models.BooleanField(default=False)),
                ('is_default_for_reconciliation', models.BooleanField(default=False)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('provider', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='accounts', to='payments.bankprovider')),
            ],
            options={
                'db_table': 'payment_provider_account',
                'ordering': ['provider', 'account_type', 'label'],
                'unique_together': {('provider', 'account_number', 'account_type')},
            },
        ),
        migrations.CreateModel(
            name='ProviderTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('direction', models.CharField(choices=[('inbound', 'Inbound'), ('outbound', 'Outbound')], max_length=10)),
                ('channel', models.CharField(max_length=40)),
                ('country', models.CharField(max_length=10)),
                ('currency', models.CharField(max_length=5)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('fee_amount', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('internal_reference', models.CharField(max_length=255, unique=True)),
                ('provider_reference', models.CharField(blank=True, max_length=255)),
                ('provider_transaction_id', models.CharField(blank=True, max_length=255)),
                ('source_account', models.CharField(blank=True, max_length=100)),
                ('destination_account', models.CharField(blank=True, max_length=100)),
                ('status', models.CharField(choices=[('created', 'Created'), ('request_signed', 'Request Signed'), ('submitted', 'Submitted'), ('acknowledged', 'Acknowledged'), ('pending_customer_action', 'Pending Customer Action'), ('provider_processing', 'Provider Processing'), ('awaiting_third_party_settlement', 'Awaiting Third Party Settlement'), ('settled', 'Settled'), ('failed', 'Failed'), ('cancelled', 'Cancelled'), ('rejected', 'Rejected'), ('settlement_exception', 'Settlement Exception'), ('reversed', 'Reversed'), ('manual_review', 'Manual Review')], default='created', max_length=40)),
                ('linked_model', models.CharField(blank=True, max_length=80)),
                ('linked_object_id', models.CharField(blank=True, max_length=80)),
                ('raw_request_checksum', models.CharField(blank=True, max_length=64)),
                ('raw_response_checksum', models.CharField(blank=True, max_length=64)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('final_at', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('provider', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transactions', to='payments.bankprovider')),
            ],
            options={
                'db_table': 'payment_provider_transaction',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProviderStatementLine',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account_number', models.CharField(max_length=100)),
                ('transaction_id', models.CharField(blank=True, max_length=255)),
                ('reference', models.CharField(blank=True, max_length=255)),
                ('serial', models.CharField(blank=True, max_length=255)),
                ('posted_date_time', models.CharField(blank=True, max_length=80)),
                ('transaction_date', models.DateField(blank=True, null=True)),
                ('description', models.TextField(blank=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('direction', models.CharField(choices=[('credit', 'Credit'), ('debit', 'Debit')], max_length=10)),
                ('running_balance', models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ('currency', models.CharField(blank=True, max_length=5)),
                ('raw_payload', models.JSONField(blank=True, default=dict)),
                ('matched_status', models.CharField(choices=[('unmatched', 'Unmatched'), ('matched', 'Matched'), ('exception', 'Exception')], default='unmatched', max_length=30)),
                ('provider', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='statement_lines', to='payments.bankprovider')),
            ],
            options={
                'db_table': 'payment_provider_statement_line',
                'ordering': ['-posted_date_time', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProviderCallback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('callback_type', models.CharField(blank=True, max_length=80)),
                ('provider_reference', models.CharField(blank=True, max_length=255)),
                ('payload_checksum', models.CharField(max_length=64)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('normalized_status', models.CharField(blank=True, max_length=40)),
                ('is_duplicate', models.BooleanField(default=False)),
                ('provider', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='callbacks', to='payments.bankprovider')),
                ('provider_transaction', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='callbacks', to='payments.providertransaction')),
            ],
            options={
                'db_table': 'payment_provider_callback',
                'ordering': ['-created_at'],
                'unique_together': {('provider', 'payload_checksum')},
            },
        ),
        migrations.AddIndex(
            model_name='paymentprovideraccount',
            index=models.Index(fields=['provider', 'account_type', 'is_active'], name='payment_pro_provide_6e8271_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentprovideraccount',
            index=models.Index(fields=['provider', 'is_default_for_collections'], name='payment_pro_provide_bb34d4_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentprovideraccount',
            index=models.Index(fields=['provider', 'is_default_for_disbursements'], name='payment_pro_provide_8fedaa_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentprovideraccount',
            index=models.Index(fields=['provider', 'is_default_for_reconciliation'], name='payment_pro_provide_46415e_idx'),
        ),
        migrations.AddIndex(
            model_name='providertransaction',
            index=models.Index(fields=['provider', 'status'], name='payment_pro_provide_6ea73b_idx'),
        ),
        migrations.AddIndex(
            model_name='providertransaction',
            index=models.Index(fields=['provider_reference'], name='payment_pro_provide_d59303_idx'),
        ),
        migrations.AddIndex(
            model_name='providertransaction',
            index=models.Index(fields=['provider_transaction_id'], name='payment_pro_provide_1c2a0b_idx'),
        ),
        migrations.AddIndex(
            model_name='providertransaction',
            index=models.Index(fields=['country', 'channel', 'status'], name='payment_pro_country_e3cdc9_idx'),
        ),
        migrations.AddIndex(
            model_name='providerstatementline',
            index=models.Index(fields=['provider', 'account_number'], name='payment_pro_provide_1cb59b_idx'),
        ),
        migrations.AddIndex(
            model_name='providerstatementline',
            index=models.Index(fields=['transaction_id'], name='payment_pro_transac_22de27_idx'),
        ),
        migrations.AddIndex(
            model_name='providerstatementline',
            index=models.Index(fields=['reference'], name='payment_pro_referen_404728_idx'),
        ),
        migrations.AddIndex(
            model_name='providerstatementline',
            index=models.Index(fields=['matched_status'], name='payment_pro_matched_27513e_idx'),
        ),
    ]

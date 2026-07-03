# Generated manually for banking-grade ledger controls on 2026-06-20

import uuid
import hashlib
import json

import django.db.models.deletion
from django.db import migrations, models


def canonical_hash(entry, previous_hash):
    payload = json.dumps(
        {
            'sequence_number': int(entry.sequence_number or 0),
            'previous_hash': previous_hash,
            'event_group_key': '',
            'group_id': str(entry.group_id),
            'member_id': str(entry.member_id or ''),
            'account_stream': entry.account_stream,
            'entry_type': entry.entry_type,
            'direction': entry.direction,
            'amount': f"{entry.amount:.2f}",
            'currency': entry.currency,
            'running_balance': f"{entry.running_balance:.2f}",
            'reference': entry.reference,
            'idempotency_key': entry.idempotency_key or '',
            'source_system': entry.source_system,
        },
        sort_keys=True,
        separators=(',', ':'),
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def backfill_ledger_sequences(apps, schema_editor):
    LedgerEntry = apps.get_model('ledger', 'LedgerEntry')
    LedgerStreamLock = apps.get_model('ledger', 'LedgerStreamLock')
    db_alias = schema_editor.connection.alias

    stream_keys = (
        LedgerEntry.objects.using(db_alias)
        .values_list('group_id', 'account_stream', 'currency')
        .distinct()
    )
    for group_id, account_stream, currency in stream_keys:
        previous_hash = '0' * 64
        current_balance = 0
        last_entry = None
        entries = (
            LedgerEntry.objects.using(db_alias)
            .filter(group_id=group_id, account_stream=account_stream, currency=currency)
            .order_by('created_at', 'id')
        )
        for sequence, entry in enumerate(entries, start=1):
            entry.sequence_number = sequence
            entry.previous_hash = previous_hash
            entry.hash = canonical_hash(entry, previous_hash)
            previous_hash = entry.hash
            current_balance = entry.running_balance
            entry.save(update_fields=['sequence_number', 'previous_hash', 'hash'], using=db_alias)
            last_entry = entry

        if last_entry is not None:
            LedgerStreamLock.objects.using(db_alias).update_or_create(
                group_id=group_id,
                account_stream=account_stream,
                currency=currency,
                defaults={
                    'last_sequence_number': last_entry.sequence_number,
                    'last_hash': last_entry.hash,
                    'current_balance': current_balance,
                },
            )


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0008_group_mandatory_savings_pending_gate'),
        ('ledger', '0005_reconciliation_run_item'),
    ]

    operations = [
        migrations.CreateModel(
            name='LedgerEventGroup',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('event_group_key', models.CharField(max_length=255, unique=True)),
                ('event_type', models.CharField(max_length=80)),
                ('source_system', models.CharField(default='orbisave', max_length=50)),
                ('status', models.CharField(choices=[('open', 'Open'), ('closed', 'Closed'), ('void', 'Void')], default='open', max_length=20)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'ledger_event_group',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='LedgerStreamLock',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('account_stream', models.CharField(max_length=40)),
                ('currency', models.CharField(max_length=5)),
                ('last_sequence_number', models.PositiveBigIntegerField(default=0)),
                ('last_hash', models.CharField(default='0000000000000000000000000000000000000000000000000000000000000000', max_length=64)),
                ('current_balance', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ledger_stream_locks', to='groups.group')),
            ],
            options={
                'db_table': 'ledger_stream_lock',
                'unique_together': {('group', 'account_stream', 'currency')},
            },
        ),
        migrations.AddField(
            model_name='ledgerentry',
            name='event_group',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='entries', to='ledger.ledgereventgroup'),
        ),
        migrations.AddField(
            model_name='ledgerentry',
            name='sequence_number',
            field=models.PositiveBigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='ledgerentry',
            name='account_stream',
            field=models.CharField(choices=[('rotation', 'Rotation Trust'), ('savings', 'Mandatory Savings'), ('loaning', 'Loaning'), ('company_revenue', 'Company Revenue'), ('suspense', 'Suspense'), ('provider_settlement', 'Provider Settlement'), ('loan_receivable', 'Loan Receivable'), ('provider_clearing', 'Provider Clearing')], default='rotation', max_length=40),
        ),
        migrations.AlterField(
            model_name='reconciliationitem',
            name='account_stream',
            field=models.CharField(choices=[('rotation', 'Rotation Trust'), ('savings', 'Mandatory Savings'), ('loaning', 'Loaning'), ('company_revenue', 'Company Revenue'), ('suspense', 'Suspense'), ('provider_settlement', 'Provider Settlement'), ('loan_receivable', 'Loan Receivable'), ('provider_clearing', 'Provider Clearing')], max_length=40),
        ),
        migrations.AlterField(
            model_name='reconciliationrun',
            name='account_stream',
            field=models.CharField(choices=[('rotation', 'Rotation Trust'), ('savings', 'Mandatory Savings'), ('loaning', 'Loaning'), ('company_revenue', 'Company Revenue'), ('suspense', 'Suspense'), ('provider_settlement', 'Provider Settlement'), ('loan_receivable', 'Loan Receivable'), ('provider_clearing', 'Provider Clearing')], max_length=40),
        ),
        migrations.RunPython(backfill_ledger_sequences, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name='ledgerstreamlock',
            index=models.Index(fields=['group', 'account_stream', 'currency'], name='ledger_stre_group_i_5d5170_idx'),
        ),
        migrations.AddIndex(
            model_name='ledgerentry',
            index=models.Index(fields=['group', 'account_stream', 'currency', 'sequence_number'], name='ledger_entr_group_i_b213b2_idx'),
        ),
        migrations.AddIndex(
            model_name='ledgerentry',
            index=models.Index(fields=['event_group'], name='ledger_entr_event_g_aa6d95_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='ledgerentry',
            unique_together={('group', 'account_stream', 'currency', 'sequence_number')},
        ),
    ]

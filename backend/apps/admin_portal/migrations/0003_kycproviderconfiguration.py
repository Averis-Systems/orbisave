# Generated manually during dashboard API wiring on 2026-06-19

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admin_portal', '0002_adminemailverification'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='KYCProviderConfiguration',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=150)),
                ('provider_code', models.CharField(choices=[('didit', 'Didit'), ('custom', 'Custom / Other')], default='didit', max_length=30)),
                ('environment', models.CharField(choices=[('sandbox', 'Sandbox'), ('live', 'Live')], default='sandbox', max_length=10)),
                ('status', models.CharField(choices=[('active', 'Active'), ('inactive', 'Inactive'), ('testing', 'Testing'), ('error', 'Error')], default='inactive', max_length=20)),
                ('base_url', models.URLField(blank=True, default='https://verification.didit.me')),
                ('workflow_id', models.CharField(blank=True, max_length=120)),
                ('client_id', models.CharField(blank=True, max_length=255)),
                ('client_secret', models.TextField(blank=True)),
                ('webhook_url', models.URLField(blank=True)),
                ('webhook_secret', models.TextField(blank=True)),
                ('allowed_events', models.JSONField(blank=True, default=list)),
                ('notes', models.TextField(blank=True)),
                ('last_tested_at', models.DateTimeField(blank=True, null=True)),
                ('last_test_status', models.CharField(blank=True, max_length=20)),
                ('last_test_message', models.TextField(blank=True)),
                ('configured_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='configured_kyc_providers', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'kyc_provider_configuration',
                'ordering': ['provider_code', 'environment', 'name'],
                'unique_together': {('provider_code', 'environment')},
            },
        ),
    ]

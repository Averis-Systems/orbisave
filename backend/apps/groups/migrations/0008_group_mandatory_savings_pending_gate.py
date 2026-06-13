# Generated manually during P0 group approval hardening on 2026-06-11

from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0007_add_group_verification_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='group',
            name='mandatory_savings_amount',
            field=models.DecimalField(decimal_places=2, default=Decimal('0'), max_digits=14),
        ),
        migrations.AddField(
            model_name='group',
            name='savings_access_day',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='group',
            name='savings_access_month',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='group',
            name='status',
            field=models.CharField(choices=[('pending_activation', 'Pending Activation'), ('active', 'Active'), ('paused', 'Paused'), ('closed', 'Closed')], default='pending_activation', max_length=20),
        ),
        migrations.AlterField(
            model_name='groupmember',
            name='status',
            field=models.CharField(choices=[('pending_approval', 'Pending Approval'), ('pending_session_refresh', 'Pending Session Refresh'), ('active', 'Active'), ('suspended', 'Suspended'), ('exited', 'Exited'), ('deceased', 'Deceased')], default='active', max_length=30),
        ),
    ]

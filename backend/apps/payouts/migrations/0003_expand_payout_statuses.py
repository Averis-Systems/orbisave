# Generated manually during P0 rotational payout state hardening on 2026-06-12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payouts', '0002_payout_cycle_payout_failure_reason_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payout',
            name='status',
            field=models.CharField(
                choices=[
                    ('scheduled', 'Scheduled'),
                    ('awaiting_contributions', 'Awaiting Contributions'),
                    ('grace_period', 'Grace Period'),
                    ('ready_for_disbursement', 'Ready for Disbursement'),
                    ('provider_processing', 'Provider Processing'),
                    ('paid', 'Paid'),
                    ('disputed', 'Disputed'),
                    ('cancelled', 'Cancelled'),
                    ('upcoming', 'Upcoming'),
                    ('processing', 'Processing'),
                    ('completed', 'Completed'),
                    ('failed', 'Failed'),
                    ('skipped', 'Skipped'),
                ],
                default='upcoming',
                max_length=30,
            ),
        ),
    ]

# Generated manually during P0 financial exception hardening on 2026-06-12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contributions', '0004_alter_contribution_member_alter_penalty_member'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contribution',
            name='status',
            field=models.CharField(
                choices=[
                    ('scheduled', 'Scheduled'),
                    ('initiated', 'Initiated'),
                    ('pending', 'Pending'),
                    ('confirmed', 'Confirmed'),
                    ('failed', 'Failed'),
                    ('disputed', 'Disputed'),
                ],
                default='scheduled',
                max_length=20,
            ),
        ),
    ]


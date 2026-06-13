# Generated manually during P0 transaction PIN hardening on 2026-06-12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_user_languages'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='transaction_pin_failed_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='user',
            name='transaction_pin_locked_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

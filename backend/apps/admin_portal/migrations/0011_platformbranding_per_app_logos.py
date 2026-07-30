from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Split the single platform logo into three per-dashboard logos (member,
    console, manager); the favicon stays a single global asset. The old `logo`
    column is dropped rather than renamed — no environment has branding
    uploaded yet, so there is nothing to preserve.
    """

    dependencies = [
        ('admin_portal', '0010_alter_adminemailverification_purpose'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='platformbranding',
            name='logo',
        ),
        migrations.AddField(
            model_name='platformbranding',
            name='member_logo',
            field=models.ImageField(blank=True, null=True, upload_to='branding/'),
        ),
        migrations.AddField(
            model_name='platformbranding',
            name='console_logo',
            field=models.ImageField(blank=True, null=True, upload_to='branding/'),
        ),
        migrations.AddField(
            model_name='platformbranding',
            name='manager_logo',
            field=models.ImageField(blank=True, null=True, upload_to='branding/'),
        ),
    ]

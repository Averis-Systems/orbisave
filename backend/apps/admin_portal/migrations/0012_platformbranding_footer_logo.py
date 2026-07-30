from django.db import migrations, models


class Migration(migrations.Migration):
    """A dedicated logo for the public dark footer (light/white treatment)."""

    dependencies = [
        ('admin_portal', '0011_platformbranding_per_app_logos'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformbranding',
            name='footer_logo',
            field=models.ImageField(blank=True, null=True, upload_to='branding/'),
        ),
    ]

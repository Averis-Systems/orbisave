from rest_framework import serializers

from .models import Feedback

MAX_SCREENSHOT_MB = 5
ALLOWED_SCREENSHOT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}


def _validate_screenshot(image):
    """Reject anything that is not a real JPG/PNG/WebP within the size cap.

    An admin opens these in a review panel, so an SVG/HTML polyglot renamed .png
    would be a stored-XSS vector, exactly as for KYC uploads. We check the size,
    the declared content type, and sniff the actual bytes with Pillow.
    """
    if image is None:
        return image
    if image.size > MAX_SCREENSHOT_MB * 1024 * 1024:
        raise serializers.ValidationError(f"Screenshot exceeds the {MAX_SCREENSHOT_MB} MB limit.")
    declared = getattr(image, 'content_type', None)
    if declared and declared not in ALLOWED_SCREENSHOT_TYPES:
        raise serializers.ValidationError("Screenshot must be a JPG, PNG or WebP image.")
    try:
        from PIL import Image
        img = Image.open(image)
        img.verify()
        if img.format not in ('JPEG', 'PNG', 'WEBP'):
            raise serializers.ValidationError("Screenshot must be a JPG, PNG or WebP image.")
    except serializers.ValidationError:
        raise
    except Exception:
        raise serializers.ValidationError("Screenshot is not a valid image.")
    finally:
        try:
            image.seek(0)
        except Exception:
            pass
    return image


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """What a member submits. reporter/country/status are set server-side."""
    class Meta:
        model = Feedback
        fields = ['category', 'subject', 'message', 'severity', 'screenshot', 'page_url']

    def validate_screenshot(self, value):
        return _validate_screenshot(value)

    def validate_severity(self, value):
        # A member may only flag normal/serious; escalation itself is an admin action.
        return value if value in dict(Feedback.SEVERITY) else 'normal'


class FeedbackSerializer(serializers.ModelSerializer):
    """Read serializer for member ("my tickets") and admin queues."""
    reporter_name = serializers.CharField(source='reporter.full_name', read_only=True, default=None)
    reporter_email = serializers.CharField(source='reporter.email', read_only=True, default=None)
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True, default=None)
    screenshot_url = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = [
            'id', 'reporter', 'reporter_name', 'reporter_email', 'country',
            'category', 'subject', 'message', 'screenshot', 'screenshot_url', 'page_url',
            'severity', 'status', 'resolution_note', 'resolved_by_name',
            'resolved_at', 'escalated_at', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_screenshot_url(self, obj):
        """Absolute URL so the Manager/Console (on a different origin) can load it."""
        if not obj.screenshot:
            return None
        request = self.context.get('request')
        url = obj.screenshot.url
        return request.build_absolute_uri(url) if request else url

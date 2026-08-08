"""
KYC upload validation tests (F4).

The live KYC endpoint (accounts/urls.py -> accounts/views.KYCSubmitView) created
the KYCDocument straight from request.FILES with no validation, while the
hardened check lived on an unrouted copy. An SVG/HTML polyglot renamed .jpg
could then stored-XSS an admin opening it in the review drawer. The live view
now runs validate_kyc_upload on front_image, selfie_image and back_image.
"""
import io
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import KYCDocument

pytestmark = pytest.mark.django_db(databases=["default", "kenya", "rwanda", "ghana"])

SUBMIT_URL = '/api/v1/auth/kyc/submit/'


def _genuine_png():
    """A real, PIL-verifiable PNG (bytes) so validate_kyc_upload accepts it."""
    buf = io.BytesIO()
    Image.new('RGB', (4, 4), (0, 128, 0)).save(buf, format='PNG')
    return buf.getvalue()


_PNG = _genuine_png()
# An SVG carrying script, the classic stored-XSS payload, mislabelled as a JPG.
_SVG_XSS = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


class TestKYCUploadValidation:
    def test_svg_disguised_as_jpg_is_rejected(self, member_client):
        front = SimpleUploadedFile('id.jpg', _SVG_XSS, content_type='image/jpeg')
        selfie = SimpleUploadedFile('selfie.jpg', _SVG_XSS, content_type='image/jpeg')
        resp = member_client.post(
            SUBMIT_URL,
            {'document_type': 'national_id', 'front_image': front, 'selfie_image': selfie},
            format='multipart',
        )
        assert resp.status_code == 400, resp.content
        assert KYCDocument.objects.count() == 0

    def test_genuine_png_is_accepted(self, member_client):
        front = SimpleUploadedFile('id.png', _PNG, content_type='image/png')
        selfie = SimpleUploadedFile('selfie.png', _PNG, content_type='image/png')
        resp = member_client.post(
            SUBMIT_URL,
            {'document_type': 'national_id', 'front_image': front, 'selfie_image': selfie},
            format='multipart',
        )
        assert resp.status_code in (200, 201), resp.content
        assert KYCDocument.objects.filter(document_type='national_id').count() == 1

    def test_oversized_file_is_rejected(self, member_client):
        big = SimpleUploadedFile('id.png', b'\x89PNG\r\n\x1a\n' + b'0' * (11 * 1024 * 1024), content_type='image/png')
        selfie = SimpleUploadedFile('selfie.png', _PNG, content_type='image/png')
        resp = member_client.post(
            SUBMIT_URL,
            {'document_type': 'national_id', 'front_image': big, 'selfie_image': selfie},
            format='multipart',
        )
        assert resp.status_code == 400, resp.content
        assert KYCDocument.objects.count() == 0

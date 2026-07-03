"""
Model fields that transparently encrypt at rest via common.encryption.

Storage types are unchanged (TextField stays text, JSONField stays json), so
existing migrations, DRF serializers, and admin forms keep working — only the
value that reaches the database is wrapped.
"""
import json

from django.db import models

from common.encryption import ENCRYPTED_PREFIX, decrypt_value, encrypt_value


class EncryptedTextField(models.TextField):
    """TextField whose stored value is Fernet-encrypted."""

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None:
            return value
        return encrypt_value(str(value))

    def from_db_value(self, value, expression, connection):
        return decrypt_value(value)


class EncryptedJSONField(models.JSONField):
    """
    JSONField whose stored value is a Fernet-encrypted JSON string scalar.
    Python code keeps seeing dicts/lists; the DB sees an opaque token.
    Legacy plaintext JSON rows read through unchanged and are encrypted on
    their next save.
    """

    def get_prep_value(self, value):
        if value is None:
            return super().get_prep_value(value)
        plaintext = json.dumps(value, cls=self.encoder)
        return super().get_prep_value(encrypt_value(plaintext))

    def from_db_value(self, value, expression, connection):
        parsed = super().from_db_value(value, expression, connection)
        if isinstance(parsed, str) and parsed.startswith(ENCRYPTED_PREFIX):
            return json.loads(decrypt_value(parsed))
        return parsed

"""
Application-layer encryption for secrets at rest (provider API keys, webhook
secrets, bank credentials). Fernet (AES-128-CBC + HMAC-SHA256) with a
versioned prefix so future key/algorithm rotations can coexist with old rows.

Key source, in order:
  1. FIELD_ENCRYPTION_KEY env var — a 32-byte urlsafe-base64 Fernet key.
     REQUIRED in production; generate with:
         python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  2. Derived from settings.SECRET_KEY (dev/test convenience only — rotating
     SECRET_KEY would orphan encrypted values, so never rely on this in prod).

Values that don't carry the prefix are returned unchanged: legacy plaintext
rows keep working and become encrypted the next time they are saved.
"""
import base64
import hashlib
import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

ENCRYPTED_PREFIX = 'enc$v1$'


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    env_key = os.environ.get('FIELD_ENCRYPTION_KEY')
    if env_key:
        return Fernet(env_key.encode())
    from django.conf import settings
    derived = hashlib.sha256(f'orbisave-field-key:{settings.SECRET_KEY}'.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


def encrypt_value(plaintext: str) -> str:
    if plaintext is None:
        return plaintext
    if not plaintext:
        return plaintext  # keep '' as '' — blank means "not configured"
    if plaintext.startswith(ENCRYPTED_PREFIX):
        return plaintext  # already encrypted; never double-wrap
    token = _fernet().encrypt(plaintext.encode()).decode()
    return f'{ENCRYPTED_PREFIX}{token}'


def decrypt_value(stored: str) -> str:
    if not stored or not isinstance(stored, str):
        return stored
    if not stored.startswith(ENCRYPTED_PREFIX):
        return stored  # legacy plaintext row — pass through
    token = stored[len(ENCRYPTED_PREFIX):]
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        raise ValueError(
            'Failed to decrypt a stored secret. FIELD_ENCRYPTION_KEY has probably '
            'changed (or SECRET_KEY, if the derived dev key was in use). Restore the '
            'original key or re-enter the affected provider credentials.'
        ) from exc


def is_encrypted(stored) -> bool:
    return isinstance(stored, str) and stored.startswith(ENCRYPTED_PREFIX)

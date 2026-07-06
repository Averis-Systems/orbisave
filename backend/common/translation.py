"""
Translation service — Google Cloud Translation v2 behind the Console config.

Why Google (researched 2026-07): it is the only major translation API covering
ALL of OrbiSave's launch languages — Kiswahili (sw), Kinyarwanda (rw), Twi (tw),
French (fr) — at ~249 supported languages. DeepL (~33 languages) has none of
the African trio; Azure covers ~100 with weaker African coverage. Pricing:
$20/M characters with a 500K-character free monthly tier; the cache below keeps
recurring system strings effectively free.

Design rules:
  * The API key lives ENCRYPTED in SystemConfiguration under
    'google_translate_api_key' (Console → Settings → Platform APIs).
  * Translations are cached (30 days) — system messages repeat constantly.
  * FAILURE NEVER BLOCKS DELIVERY: if translation errors or no key is
    configured, the English original is sent. An OTP in English beats no OTP.
  * resolve_user_language honors the user's chosen languages (first supported
    one wins), falling back to English.
"""
import hashlib

import requests
import structlog
from django.core.cache import cache

logger = structlog.get_logger(__name__)

GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'
CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days — system strings are highly repetitive
CONFIG_KEY = 'google_translate_api_key'

# Launch language set. Keys are Google/ISO codes; extend as markets open.
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'sw': 'Kiswahili',
    'rw': 'Kinyarwanda',
    'fr': 'Français',
    'tw': 'Twi',
}

# Sensible per-country defaults applied ONLY when a user somehow registered
# without choosing (API clients, legacy rows) — the UI requires an explicit
# choice of at least two.
COUNTRY_DEFAULT_LANGUAGES = {
    'kenya': ['en', 'sw'],
    'rwanda': ['en', 'rw'],
    'ghana': ['en', 'tw'],
}


def default_languages_for_country(country) -> list:
    return list(COUNTRY_DEFAULT_LANGUAGES.get((country or '').lower(), ['en', 'sw']))


def resolve_user_language(user) -> str:
    """
    The language this user should be served in: the FIRST of their chosen
    languages that we support ("always serve them in at least one among the
    selected"), else the first supported country default, else English.
    """
    for code in (getattr(user, 'languages', None) or []):
        if code in SUPPORTED_LANGUAGES:
            return code
    for code in default_languages_for_country(getattr(user, 'country', None)):
        if code in SUPPORTED_LANGUAGES:
            return code
    return 'en'


def _api_key():
    from apps.admin_portal.models import SystemConfiguration
    return SystemConfiguration.get_value(CONFIG_KEY)


def translate(text: str, target: str, source: str = 'en') -> str:
    """
    Translate `text` into `target`. Returns the ORIGINAL text on any problem
    (unsupported target, missing key, API failure) — delivery never blocks.
    """
    if not text or target == source or target not in SUPPORTED_LANGUAGES:
        return text

    cache_key = f"tr:{target}:{hashlib.sha256(f'{source}:{text}'.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    api_key = _api_key()
    if not api_key:
        logger.info('translation_skipped_no_key', target=target)
        return text

    try:
        response = requests.post(
            GOOGLE_TRANSLATE_ENDPOINT,
            params={'key': api_key},
            json={'q': text, 'source': source, 'target': target, 'format': 'text'},
            timeout=8,
        )
        response.raise_for_status()
        translated = response.json()['data']['translations'][0]['translatedText']
    except Exception as exc:
        logger.warning('translation_failed', target=target, error=str(exc))
        return text

    try:
        cache.set(cache_key, translated, timeout=CACHE_TTL_SECONDS)
    except Exception:
        pass
    return translated


def translate_for_user(text: str, user) -> str:
    """Serve `text` in the user's preferred supported language."""
    return translate(text, resolve_user_language(user))

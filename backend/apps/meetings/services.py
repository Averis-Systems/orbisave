import re
from dataclasses import dataclass

import requests
from django.utils import timezone

from apps.admin_portal.models import MeetingProviderConfiguration


class DailyMeetingConfigurationError(Exception):
    pass


class DailyMeetingProviderError(Exception):
    pass


@dataclass(frozen=True)
class DailyRoom:
    name: str
    url: str


def _active_daily_provider():
    provider = (
        MeetingProviderConfiguration.objects
        .filter(provider_code='daily', status='active')
        .exclude(api_key='')
        .order_by('environment', 'name')
        .first()
    )
    if provider is None:
        raise DailyMeetingConfigurationError('Daily.co is not configured or active.')
    return provider


def _room_name(meeting):
    raw = f"orbisave-{meeting.group_id}-{meeting.id}"
    return re.sub(r'[^a-zA-Z0-9_-]', '-', raw)[:128]


def create_daily_room_for_meeting(meeting) -> DailyRoom:
    provider = _active_daily_provider()
    expires_at = int((meeting.scheduled_at + timezone.timedelta(hours=6)).timestamp())
    payload = {
        'name': _room_name(meeting),
        'privacy': 'private',
        'properties': {
            'exp': expires_at,
            'enable_chat': True,
            'enable_screenshare': True,
            'start_video_off': True,
            'start_audio_off': False,
        },
    }

    response = requests.post(
        f"{provider.base_url.rstrip('/')}/rooms",
        json=payload,
        headers={
            'Authorization': f"Bearer {provider.api_key}",
            'Content-Type': 'application/json',
        },
        timeout=15,
    )
    try:
        response.raise_for_status()
    except requests.RequestException as exc:
        raise DailyMeetingProviderError('Daily.co room creation failed.') from exc

    data = response.json()
    return DailyRoom(name=data.get('name') or payload['name'], url=data.get('url') or '')

"""
Django Channels WebSocket consumer for real-time group events.
Satisfies:
  - System Design Checklist §2 (Architecture — real-time layer)
  - Frontend System Design Checklist §13 (API Integration — WebSocket events)

Connection: ws(s)://api/ws/group/{group_id}/?token=<access_token>

Events emitted to group room:
  contribution.confirmed    — after webhook confirms payment
  contribution.failed       — after webhook flags payment failure
  contribution.overdue      — after deadline enforcement task runs
  payout.completed          — after payout service completes disbursement
  loan.status_changed       — after any loan state transition
  loan.repayment_overdue    — after repayment flagged overdue
  loan.defaulted            — after loan escalated to default
  kyc.verified              — after admin marks KYC as verified
  member.joined             — after invite accepted
  cycle.completed           — after rotation cycle completes
"""
import json
import structlog
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = structlog.get_logger(__name__)


class GroupConsumer(AsyncWebsocketConsumer):
    """
    Authenticated WebSocket consumer scoped per group.
    Each authenticated member of a group can subscribe to their group's room.
    """

    async def connect(self):
        group_id = self.scope['url_route']['kwargs']['group_id']
        self.group_id = group_id
        self.room_name = f"group_{group_id}"

        # ── JWT Authentication ──────────────────────────────────────────────
        token = self._extract_token()
        user = await self._authenticate(token)

        if user is None:
            logger.warning('ws_auth_failed', group_id=group_id)
            await self.close(code=4001)
            return

        # ── Membership Check ────────────────────────────────────────────────
        is_member = await self._is_group_member(user, group_id)
        if not is_member:
            logger.warning('ws_membership_denied', user_id=user.id, group_id=group_id)
            await self.close(code=4003)
            return

        self.user = user

        # ── Join Channel Group ───────────────────────────────────────────────
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

        logger.info('ws_connected', user_id=user.id, group_id=group_id)

        # Send connection acknowledgement
        await self.send(text_data=json.dumps({
            'type': 'connection.established',
            'payload': {'group_id': str(group_id), 'user_id': str(user.id)},
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'room_name'):
            await self.channel_layer.group_discard(self.room_name, self.channel_name)
            logger.info('ws_disconnected', group_id=self.group_id, code=close_code)

    async def receive(self, text_data):
        """
        Clients can send ping to keep alive. All other real-time data
        flows server → client only (push model, not request-response).
        """
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except (json.JSONDecodeError, KeyError):
            pass

    # ── Channel Layer Event Handlers (server → client broadcasts) ───────────

    async def group_event(self, event):
        """
        Generic handler: receives any event from channel_layer.group_send
        with type='group.event' and forwards it to the connected WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type': event['event'],
            'payload': event.get('payload', {}),
        }))

    # ── Internal Auth Helpers ────────────────────────────────────────────────

    def _extract_token(self) -> str | None:
        """Extract JWT from query string: ?token=<jwt>"""
        query_string = self.scope.get('query_string', b'').decode()
        for part in query_string.split('&'):
            if part.startswith('token='):
                return part[len('token='):]
        return None

    @database_sync_to_async
    def _authenticate(self, token: str | None):
        """Validate RS256 JWT and return the User if valid, else None."""
        if not token:
            return None
        try:
            import jwt
            from django.conf import settings
            from apps.accounts.models import User

            payload = jwt.decode(
                token,
                settings.JWT_PUBLIC_KEY,
                algorithms=['RS256'],
                audience='orbisave_api',
                issuer='orbisave_django',
            )
            user_id = payload.get('sub')
            return User.objects.get(id=user_id, is_active=True)
        except Exception:
            return None

    @database_sync_to_async
    def _is_group_member(self, user, group_id) -> bool:
        """Returns True if user has an active GroupMember record for this group."""
        from apps.groups.models import GroupMember
        return GroupMember.objects.filter(
            group_id=group_id,
            member=user,
            status='active',
        ).exists()

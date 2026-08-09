import structlog
from django.utils import timezone
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Feedback
from .serializers import FeedbackCreateSerializer, FeedbackSerializer
from common.permissions import IsPlatformAdmin

logger = structlog.get_logger(__name__)


class MemberFeedbackViewSet(mixins.CreateModelMixin,
                            mixins.ListModelMixin,
                            mixins.RetrieveModelMixin,
                            viewsets.GenericViewSet):
    """Member-facing: submit feedback and view your own tickets.

    A member marking an item 'serious' escalates it straight to the super admin
    (visible to their country manager too); normal items land in the manager's
    country queue.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        return FeedbackCreateSerializer if self.action == 'create' else FeedbackSerializer

    def get_queryset(self):
        return Feedback.objects.filter(reporter=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        is_serious = serializer.validated_data.get('severity') == 'serious'
        feedback = serializer.save(
            reporter=request.user,
            country=getattr(request.user, 'country', '') or '',
            status='escalated' if is_serious else 'open',
            escalated_at=timezone.now() if is_serious else None,
        )
        logger.info(
            'feedback_submitted', feedback_id=str(feedback.id),
            country=feedback.country, severity=feedback.severity, escalated=is_serious,
        )
        return Response(FeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)


class AdminFeedbackViewSet(mixins.ListModelMixin,
                           mixins.RetrieveModelMixin,
                           viewsets.GenericViewSet):
    """Admin-facing queue, role-scoped:

    - platform_admin (country manager): only their own country's feedback.
    - super_admin: everything, with `?escalated=true` to focus the escalated
      queue.

    A manager resolves items or escalates a serious one to the super admin.
    """
    permission_classes = [IsPlatformAdmin]
    serializer_class = FeedbackSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Feedback.objects.all().select_related('reporter', 'resolved_by')
        if getattr(user, 'role', None) != 'super_admin':
            # Country managers are scoped to their own country.
            qs = qs.filter(country=getattr(user, 'country', '') or '')
        # Optional filters.
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if self.request.query_params.get('escalated') in ('1', 'true', 'True'):
            qs = qs.filter(status='escalated')
        return qs

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        feedback = self.get_object()  # get_queryset already scopes to the caller's remit
        note = (request.data.get('resolution_note') or '').strip()
        feedback.status = 'resolved'
        feedback.resolution_note = note
        feedback.resolved_by = request.user
        feedback.resolved_at = timezone.now()
        feedback.save(update_fields=['status', 'resolution_note', 'resolved_by', 'resolved_at', 'updated_at'])
        self._notify_reporter(feedback, 'Your feedback has been resolved',
                              note or 'Our team has resolved the issue you reported.')
        logger.info('feedback_resolved', feedback_id=str(feedback.id), by=str(request.user.id))
        return Response(FeedbackSerializer(feedback).data)

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        feedback = self.get_object()
        feedback.status = 'escalated'
        feedback.severity = 'serious'
        feedback.escalated_at = timezone.now()
        feedback.save(update_fields=['status', 'severity', 'escalated_at', 'updated_at'])
        logger.info('feedback_escalated', feedback_id=str(feedback.id), by=str(request.user.id))
        return Response(FeedbackSerializer(feedback).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Mark an open item as in-progress so the reporter/other admins see it's owned."""
        feedback = self.get_object()
        feedback.status = 'in_progress'
        feedback.save(update_fields=['status', 'updated_at'])
        return Response(FeedbackSerializer(feedback).data)

    def _notify_reporter(self, feedback, title, body):
        if feedback.reporter_id is None:
            return
        try:
            from apps.notifications.services import notify_user
            notify_user(
                feedback.reporter, title=title, body=body,
                notification_type='admin_alert', related_object_id=str(feedback.id),
            )
        except Exception:
            # Notification is best-effort; never fail the resolve because of it.
            logger.warning('feedback_reporter_notify_failed', feedback_id=str(feedback.id))

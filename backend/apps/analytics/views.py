from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.groups.models import Group
from common.permissions import IsGroupMember


class GroupAnalyticsViewSet(viewsets.ViewSet):
    """Group health and cashflow analytics.

    These endpoints previously returned a hardcoded health score and made-up
    cashflow figures. Serving fabricated numbers from a live API is a real risk,
    a caller cannot tell them from real data, so until the metrics are derived
    from live ledger and contribution records (the GroupHealthSnapshot rollup,
    tracked as M6 in docs/areas_of_concern.md) they honestly report that the
    data is not yet available instead of inventing values.
    """
    permission_classes = [IsGroupMember]

    _NOT_READY = {
        'available': False,
        'detail': 'Group analytics are not yet computed from live ledger data.',
    }

    @action(detail=True, methods=['get'])
    def health(self, request, pk=None):
        # Resolve the group so a bad id is a clean 404, not a 500.
        get_object_or_404(Group, pk=pk)
        return Response(self._NOT_READY, status=status.HTTP_501_NOT_IMPLEMENTED)

    @action(detail=True, methods=['get'])
    def trends(self, request, pk=None):
        get_object_or_404(Group, pk=pk)
        return Response(self._NOT_READY, status=status.HTTP_501_NOT_IMPLEMENTED)

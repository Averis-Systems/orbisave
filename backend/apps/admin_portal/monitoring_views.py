from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncHour, TruncDay
from django.utils import timezone
from datetime import timedelta
from apps.payments.models import ProviderApiLog
from common.pagination import paginate_admin_queryset
from .log_serializers import ApiLogSerializer
from .views import IsSuperAdmin

class ApiActivityMetricsView(APIView):
    """
    GET /api/v1/superadmin/monitoring/metrics/
    Returns time-series data for usage graphs.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)
        
        # Aggregate by day
        metrics = ProviderApiLog.objects.filter(created_at__gte=start_date)\
            .annotate(day=TruncDay('created_at'))\
            .values('day')\
            .annotate(
                total_calls=Count('id'),
                success_count=Count('id', filter=Q(success=True)),
                error_count=Count('id', filter=Q(success=False)),
                avg_latency=Avg('duration_ms')
            ).order_by('day')

        return Response({
            'history': metrics,
            'summary': {
                'total_calls': sum(m['total_calls'] for m in metrics),
                'avg_latency': sum(m['avg_latency'] or 0 for m in metrics) / (len(metrics) or 1),
                'success_rate': (sum(m['success_count'] for m in metrics) / sum(m['total_calls'] for m in metrics) * 100) if metrics else 100
            }
        })

class ApiOperationalLogsView(APIView):
    """
    GET /api/v1/superadmin/monitoring/logs/
    Returns detailed operational logs.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = ProviderApiLog.objects.all().select_related('provider')
        
        # Basic filters
        success = request.query_params.get('success')
        if success is not None:
            qs = qs.filter(success=success.lower() == 'true')
            
        provider_id = request.query_params.get('provider_id')
        if provider_id:
            qs = qs.filter(provider_id=provider_id)

        page_items, meta = paginate_admin_queryset(request, qs.order_by('-created_at'))
        serializer = ApiLogSerializer(page_items, many=True)
        return Response({**meta, 'results': serializer.data})

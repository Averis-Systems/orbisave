from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import SystemConfiguration
from .serializers import SystemConfigurationSerializer
from .views import IsSuperAdmin
import structlog

logger = structlog.get_logger(__name__)

class ConfigListView(APIView):
    """
    GET /api/v1/superadmin/settings/
    Lists all system configurations.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        category = request.query_params.get('category')
        qs = SystemConfiguration.objects.all()
        if category:
            qs = qs.filter(category=category)
        
        serializer = SystemConfigurationSerializer(qs, many=True)
        return Response(serializer.data)

class ConfigUpdateView(APIView):
    """
    PATCH /api/v1/superadmin/settings/<uuid:config_id>/
    Updates a specific configuration key.
    """
    permission_classes = [IsSuperAdmin]

    def patch(self, request, config_id):
        try:
            config = SystemConfiguration.objects.get(id=config_id)
        except SystemConfiguration.DoesNotExist:
            return Response({'error': 'Configuration not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SystemConfigurationSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Audit log
            from apps.audit.models import AuditLog
            AuditLog.objects.create(
                action='system_config_update',
                actor=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'key': config.key, 'category': config.category}
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConfigCreateView(APIView):
    """
    POST /api/v1/superadmin/settings/
    Creates a new configuration key.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        serializer = SystemConfigurationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

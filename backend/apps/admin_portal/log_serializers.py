from rest_framework import serializers
from apps.payments.models import ProviderApiLog

class ApiLogSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    
    class Meta:
        model = ProviderApiLog
        fields = [
            'id', 'provider_name', 'direction', 'endpoint', 'method', 
            'request_body', 'response_code', 'response_body', 
            'duration_ms', 'success', 'reference', 'error_message', 'created_at'
        ]

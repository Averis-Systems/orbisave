from rest_framework import serializers
from .models import SystemConfiguration

class SystemConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = ['id', 'key', 'value', 'category', 'description', 'is_encrypted', 'is_public', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Mask sensitive values in the basic list/detail view if they are encrypted
        if instance.is_encrypted:
            ret['value'] = '********'
        return ret

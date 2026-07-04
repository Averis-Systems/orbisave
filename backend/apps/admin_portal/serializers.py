from rest_framework import serializers
from common.encryption import encrypt_value, is_encrypted as value_is_encrypted
from .models import (
    CountryPolicy,
    KYCProviderConfiguration,
    MeetingProviderConfiguration,
    NotificationProviderConfiguration,
    SystemConfiguration,
)

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

    def validate(self, attrs):
        # Sensitive config values (API keys, e.g. the translation key) are
        # Fernet-encrypted at rest the moment they're saved through the API.
        # Consumers read them via SystemConfiguration.get_value(key).
        flag = attrs.get('is_encrypted', getattr(self.instance, 'is_encrypted', False))
        value = attrs.get('value')
        if flag and value and not value_is_encrypted(value):
            attrs['value'] = encrypt_value(value)
        # An edit form round-trips the mask — treat it as "unchanged".
        if self.instance is not None and value == '********':
            attrs.pop('value', None)
        return attrs


class NotificationProviderConfigurationSerializer(serializers.ModelSerializer):
    configured_by_name = serializers.CharField(
        source='configured_by.full_name',
        read_only=True,
        default=None,
    )
    has_api_key = serializers.SerializerMethodField()

    class Meta:
        model = NotificationProviderConfiguration
        fields = [
            'id', 'name', 'provider_code', 'environment', 'status',
            'username', 'api_key', 'sender_id', 'notes',
            'configured_by_name', 'has_api_key',
            'last_tested_at', 'last_test_status', 'last_test_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'configured_by_name', 'has_api_key',
            'last_tested_at', 'last_test_status', 'last_test_message',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'api_key': {'write_only': True, 'required': False, 'allow_blank': True},
        }

    def get_has_api_key(self, obj):
        return bool(obj.api_key)

    def update(self, instance, validated_data):
        if validated_data.get('api_key') == '':
            validated_data.pop('api_key')
        return super().update(instance, validated_data)


class KYCProviderConfigurationSerializer(serializers.ModelSerializer):
    configured_by_name = serializers.CharField(
        source='configured_by.full_name',
        read_only=True,
        default=None,
    )
    has_client_secret = serializers.SerializerMethodField()
    has_webhook_secret = serializers.SerializerMethodField()

    class Meta:
        model = KYCProviderConfiguration
        fields = [
            'id', 'name', 'provider_code', 'environment', 'status',
            'base_url', 'workflow_id', 'client_id', 'client_secret',
            'webhook_url', 'webhook_secret', 'allowed_events', 'notes',
            'configured_by_name', 'has_client_secret', 'has_webhook_secret',
            'last_tested_at', 'last_test_status', 'last_test_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'configured_by_name', 'has_client_secret', 'has_webhook_secret',
            'last_tested_at', 'last_test_status', 'last_test_message',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'client_secret': {'write_only': True, 'required': False, 'allow_blank': True},
            'webhook_secret': {'write_only': True, 'required': False, 'allow_blank': True},
        }

    def get_has_client_secret(self, obj):
        return bool(obj.client_secret)

    def get_has_webhook_secret(self, obj):
        return bool(obj.webhook_secret)

    def update(self, instance, validated_data):
        if validated_data.get('client_secret') == '':
            validated_data.pop('client_secret')
        if validated_data.get('webhook_secret') == '':
            validated_data.pop('webhook_secret')
        return super().update(instance, validated_data)


class MeetingProviderConfigurationSerializer(serializers.ModelSerializer):
    configured_by_name = serializers.CharField(
        source='configured_by.full_name',
        read_only=True,
        default=None,
    )
    has_api_key = serializers.SerializerMethodField()
    has_webhook_secret = serializers.SerializerMethodField()

    class Meta:
        model = MeetingProviderConfiguration
        fields = [
            'id', 'name', 'provider_code', 'environment', 'status',
            'base_url', 'api_key', 'webhook_url', 'webhook_secret',
            'allowed_events', 'notes', 'configured_by_name',
            'has_api_key', 'has_webhook_secret',
            'last_tested_at', 'last_test_status', 'last_test_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'configured_by_name', 'has_api_key', 'has_webhook_secret',
            'last_tested_at', 'last_test_status', 'last_test_message',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'api_key': {'write_only': True, 'required': False, 'allow_blank': True},
            'webhook_secret': {'write_only': True, 'required': False, 'allow_blank': True},
        }

    def get_has_api_key(self, obj):
        return bool(obj.api_key)

    def get_has_webhook_secret(self, obj):
        return bool(obj.webhook_secret)

    def validate_provider_code(self, value):
        if value != 'daily':
            raise serializers.ValidationError('Daily.co is the only supported meeting provider.')
        return value

    def update(self, instance, validated_data):
        if validated_data.get('api_key') == '':
            validated_data.pop('api_key')
        if validated_data.get('webhook_secret') == '':
            validated_data.pop('webhook_secret')
        return super().update(instance, validated_data)


class CountryPolicySerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(
        source='updated_by.full_name',
        read_only=True,
        default=None,
    )

    class Meta:
        model = CountryPolicy
        fields = [
            'id', 'country', 'currency', 'central_bank_name',
            'max_loan_interest_rate_monthly',
            'recommended_loan_interest_rate_monthly',
            'source_url', 'notes', 'is_active',
            'updated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_by_name', 'created_at', 'updated_at']

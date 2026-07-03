"""
Admin Portal — Provider Hub Views (Super Admin only)
======================================================
Full CRUD + test-connection + toggle for bank/payment provider records.
All credential management happens here — no env files needed.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from apps.payments.models import BankProvider, PaymentProviderAccount, ProviderApiLog
from .views import IsSuperAdmin
import structlog

logger = structlog.get_logger(__name__)


# ── Serializers ──────────────────────────────────────────────────────────────

class PaymentProviderAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentProviderAccount
        fields = [
            'id', 'label', 'account_type', 'account_number', 'account_name',
            'country_code', 'currency', 'bank_code', 'branch_code', 'is_active',
            'is_default_for_collections', 'is_default_for_disbursements',
            'is_default_for_reconciliation', 'metadata', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BankProviderSerializer(serializers.ModelSerializer):
    configured_by_name = serializers.CharField(
        source='configured_by.full_name', read_only=True, default=None
    )
    accounts = PaymentProviderAccountSerializer(many=True, required=False)
    has_api_secret = serializers.SerializerMethodField()
    has_webhook_secret = serializers.SerializerMethodField()

    class Meta:
        model = BankProvider
        fields = [
            'id', 'name', 'provider_code', 'country', 'environment', 'status',
            'api_key', 'api_secret', 'merchant_code', 'extra_config',
            'base_url', 'webhook_url', 'webhook_secret',
            'supports_collections', 'supports_disbursements', 'supports_mobile_money',
            'supported_mobile_methods',
            'accounts', 'has_api_secret', 'has_webhook_secret',
            'configured_by_name', 'last_tested_at', 'last_test_status',
            'last_test_message', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at',
                            'last_tested_at', 'last_test_status', 'last_test_message',
                            'configured_by_name']
        extra_kwargs = {
            'api_secret':     {'write_only': True},
            'webhook_secret': {'write_only': True},
        }

    def get_has_api_secret(self, obj):
        return bool(obj.api_secret)

    def get_has_webhook_secret(self, obj):
        return bool(obj.webhook_secret)

    def validate(self, attrs):
        provider_code = attrs.get('provider_code', getattr(self.instance, 'provider_code', ''))
        country = attrs.get('country', getattr(self.instance, 'country', ''))
        if provider_code == 'jenga_ke' and country != 'kenya':
            raise serializers.ValidationError({'country': 'jenga_ke can only be configured for Kenya.'})
        return attrs

    def _save_accounts(self, provider, accounts):
        if accounts is None:
            return
        keep_ids = []
        for account_data in accounts:
            account_id = account_data.pop('id', None)
            if account_id:
                account = provider.accounts.get(id=account_id)
                for key, value in account_data.items():
                    setattr(account, key, value)
                account.save()
            else:
                account = provider.accounts.create(**account_data)
            keep_ids.append(account.id)

        if keep_ids:
            provider.accounts.exclude(id__in=keep_ids).update(is_active=False)

    def create(self, validated_data):
        accounts = validated_data.pop('accounts', [])
        provider = super().create(validated_data)
        self._save_accounts(provider, accounts)
        return provider

    def update(self, instance, validated_data):
        accounts = validated_data.pop('accounts', None)
        if validated_data.get('api_secret') == '':
            validated_data.pop('api_secret')
        if validated_data.get('webhook_secret') == '':
            validated_data.pop('webhook_secret')
        provider = super().update(instance, validated_data)
        self._save_accounts(provider, accounts)
        return provider


class ProviderApiLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderApiLog
        fields = ['id', 'direction', 'endpoint', 'method', 'response_code',
                  'success', 'duration_ms', 'reference', 'error_message', 'created_at']


# ── Views ─────────────────────────────────────────────────────────────────────

class ProviderHubListView(APIView):
    """
    GET  /api/v1/superadmin/payment-providers/       → list all providers
    POST /api/v1/superadmin/payment-providers/       → create new provider
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        country = request.query_params.get('country')
        qs = BankProvider.objects.all().order_by('country', 'name')
        if country:
            qs = qs.filter(country=country)
        serializer = BankProviderSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    def post(self, request):
        serializer = BankProviderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.save(configured_by=request.user)
        logger.info('provider_created', provider_id=str(provider.id),
                    admin=str(request.user.id))
        return Response(BankProviderSerializer(provider).data,
                        status=status.HTTP_201_CREATED)


class ProviderHubDetailView(APIView):
    """
    GET    /api/v1/superadmin/payment-providers/<id>/
    PATCH  /api/v1/superadmin/payment-providers/<id>/
    DELETE /api/v1/superadmin/payment-providers/<id>/
    """
    permission_classes = [IsSuperAdmin]

    def _get_object(self, pk):
        try:
            return BankProvider.objects.get(id=pk)
        except BankProvider.DoesNotExist:
            return None

    def get(self, request, provider_id):
        obj = self._get_object(provider_id)
        if not obj:
            return Response({'error': 'Provider not found.'}, status=404)
        # Include recent logs
        logs = ProviderApiLog.objects.filter(provider=obj).order_by('-created_at')[:50]
        return Response({
            'provider': BankProviderSerializer(obj).data,
            'recent_logs': ProviderApiLogSerializer(logs, many=True).data,
        })

    def patch(self, request, provider_id):
        obj = self._get_object(provider_id)
        if not obj:
            return Response({'error': 'Provider not found.'}, status=404)
        serializer = BankProviderSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info('provider_updated', provider_id=str(provider_id),
                    admin=str(request.user.id))
        return Response(serializer.data)

    def delete(self, request, provider_id):
        obj = self._get_object(provider_id)
        if not obj:
            return Response({'error': 'Provider not found.'}, status=404)
        name = obj.name
        obj.delete()
        logger.info('provider_deleted', provider_name=name,
                    admin=str(request.user.id))
        return Response({'message': f'Provider "{name}" deleted.'})


class ProviderToggleView(APIView):
    """
    POST /api/v1/superadmin/payment-providers/<id>/toggle/
    Flip active ↔ inactive (kill switch).
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = BankProvider.objects.get(id=provider_id)
        except BankProvider.DoesNotExist:
            return Response({'error': 'Provider not found.'}, status=404)

        if provider.status == 'active':
            provider.status = 'inactive'
            msg = f'Provider "{provider.name}" deactivated (kill switch engaged).'
        else:
            provider.status = 'active'
            msg = f'Provider "{provider.name}" activated.'
        provider.save(update_fields=['status', 'updated_at'])

        logger.info('provider_toggled', provider_id=str(provider_id),
                    new_status=provider.status, admin=str(request.user.id))
        return Response({'status': provider.status, 'message': msg})


class ProviderTestView(APIView):
    """
    POST /api/v1/superadmin/payment-providers/<id>/test/
    Attempts a real connection and records latency + result.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = BankProvider.objects.get(id=provider_id)
        except BankProvider.DoesNotExist:
            return Response({'error': 'Provider not found.'}, status=404)

        from apps.payments.selector import get_provider_by_id
        try:
            impl = get_provider_by_id(str(provider.id))
            result = impl.test_connection()
        except Exception as exc:
            result = {'success': False, 'latency_ms': 0, 'message': str(exc)}

        # Persist result
        provider.last_tested_at  = timezone.now()
        provider.last_test_status = 'ok' if result['success'] else 'error'
        provider.last_test_message = result.get('message', '')
        if not result['success']:
            provider.status = 'error'
        provider.save(update_fields=[
            'last_tested_at', 'last_test_status', 'last_test_message',
            'status', 'updated_at'
        ])

        return Response(result)

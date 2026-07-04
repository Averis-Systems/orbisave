from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import (
    CountryPolicy,
    KYCProviderConfiguration,
    MeetingProviderConfiguration,
    NotificationProviderConfiguration,
    SystemConfiguration,
)
from .serializers import (
    CountryPolicySerializer,
    KYCProviderConfigurationSerializer,
    MeetingProviderConfigurationSerializer,
    NotificationProviderConfigurationSerializer,
    SystemConfigurationSerializer,
)
from .views import IsSuperAdmin
import structlog

logger = structlog.get_logger(__name__)


def _audit_admin_action(request, action, metadata):
    from apps.audit.models import AuditLog

    AuditLog.objects.create(
        action='admin_action',
        actor=request.user,
        ip_address=request.META.get('REMOTE_ADDR'),
        metadata={'admin_action': action, **metadata},
    )

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
            _audit_admin_action(
                request,
                'system_config_update',
                {'key': config.key, 'category': config.category},
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
            config = serializer.save()
            _audit_admin_action(
                request,
                'system_config_create',
                {'key': config.key, 'category': config.category},
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class KYCProviderListView(APIView):
    """
    GET/POST /api/v1/admin-portal/superadmin/kyc-providers/
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = KYCProviderConfiguration.objects.all()
        serializer = KYCProviderConfigurationSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    def post(self, request):
        serializer = KYCProviderConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.save(configured_by=request.user)
        _audit_admin_action(
            request,
            'kyc_provider_create',
            {
                'provider_id': str(provider.id),
                'provider_code': provider.provider_code,
                'environment': provider.environment,
            },
        )
        return Response(
            KYCProviderConfigurationSerializer(provider).data,
            status=status.HTTP_201_CREATED,
        )


class KYCProviderDetailView(APIView):
    """
    PATCH/DELETE /api/v1/admin-portal/superadmin/kyc-providers/<id>/
    """
    permission_classes = [IsSuperAdmin]

    def _get_object(self, provider_id):
        try:
            return KYCProviderConfiguration.objects.get(id=provider_id)
        except KYCProviderConfiguration.DoesNotExist:
            return None

    def patch(self, request, provider_id):
        provider = self._get_object(provider_id)
        if provider is None:
            return Response({'error': 'KYC provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = KYCProviderConfigurationSerializer(provider, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        provider = serializer.save()
        _audit_admin_action(
            request,
            'kyc_provider_update',
            {'provider_id': str(provider.id), 'provider_code': provider.provider_code},
        )
        return Response(KYCProviderConfigurationSerializer(provider).data)

    def delete(self, request, provider_id):
        provider = self._get_object(provider_id)
        if provider is None:
            return Response({'error': 'KYC provider not found.'}, status=status.HTTP_404_NOT_FOUND)
        metadata = {'provider_id': str(provider.id), 'provider_code': provider.provider_code}
        provider.delete()
        _audit_admin_action(request, 'kyc_provider_delete', metadata)
        return Response({'message': 'KYC provider removed.'})


class KYCProviderToggleView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = KYCProviderConfiguration.objects.get(id=provider_id)
        except KYCProviderConfiguration.DoesNotExist:
            return Response({'error': 'KYC provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        provider.status = 'inactive' if provider.status == 'active' else 'active'
        provider.save(update_fields=['status', 'updated_at'])
        _audit_admin_action(
            request,
            'kyc_provider_toggle',
            {'provider_id': str(provider.id), 'new_status': provider.status},
        )
        return Response({'status': provider.status})


class KYCProviderTestView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = KYCProviderConfiguration.objects.get(id=provider_id)
        except KYCProviderConfiguration.DoesNotExist:
            return Response({'error': 'KYC provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        missing = [
            label for label, value in [
                ('base_url', provider.base_url),
                ('client_id', provider.client_id),
                ('client_secret', provider.client_secret),
                ('workflow_id', provider.workflow_id),
                ('webhook_url', provider.webhook_url),
                ('webhook_secret', provider.webhook_secret),
            ] if not value
        ]
        success = not missing
        provider.last_tested_at = timezone.now()
        provider.last_test_status = 'ready' if success else 'error'
        provider.last_test_message = (
            'Configuration is ready for Didit API handshake.'
            if success
            else f"Missing required fields: {', '.join(missing)}."
        )
        if not success:
            provider.status = 'error'
        provider.save(update_fields=[
            'last_tested_at', 'last_test_status', 'last_test_message',
            'status', 'updated_at',
        ])
        _audit_admin_action(
            request,
            'kyc_provider_test',
            {'provider_id': str(provider.id), 'success': success},
        )
        return Response({
            'success': success,
            'status': provider.last_test_status,
            'message': provider.last_test_message,
            'missing': missing,
        })


class MeetingProviderListView(APIView):
    """
    GET/POST /api/v1/admin-portal/superadmin/meeting-providers/
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = MeetingProviderConfiguration.objects.all()
        serializer = MeetingProviderConfigurationSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    def post(self, request):
        serializer = MeetingProviderConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.save(configured_by=request.user)
        _audit_admin_action(
            request,
            'meeting_provider_create',
            {
                'provider_id': str(provider.id),
                'provider_code': provider.provider_code,
                'environment': provider.environment,
            },
        )
        return Response(
            MeetingProviderConfigurationSerializer(provider).data,
            status=status.HTTP_201_CREATED,
        )


class MeetingProviderDetailView(APIView):
    """
    PATCH/DELETE /api/v1/admin-portal/superadmin/meeting-providers/<id>/
    """
    permission_classes = [IsSuperAdmin]

    def _get_object(self, provider_id):
        try:
            return MeetingProviderConfiguration.objects.get(id=provider_id)
        except MeetingProviderConfiguration.DoesNotExist:
            return None

    def patch(self, request, provider_id):
        provider = self._get_object(provider_id)
        if provider is None:
            return Response({'error': 'Meeting provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = MeetingProviderConfigurationSerializer(provider, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        provider = serializer.save()
        _audit_admin_action(
            request,
            'meeting_provider_update',
            {'provider_id': str(provider.id), 'provider_code': provider.provider_code},
        )
        return Response(MeetingProviderConfigurationSerializer(provider).data)

    def delete(self, request, provider_id):
        provider = self._get_object(provider_id)
        if provider is None:
            return Response({'error': 'Meeting provider not found.'}, status=status.HTTP_404_NOT_FOUND)
        metadata = {'provider_id': str(provider.id), 'provider_code': provider.provider_code}
        provider.delete()
        _audit_admin_action(request, 'meeting_provider_delete', metadata)
        return Response({'message': 'Meeting provider removed.'})


class MeetingProviderToggleView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = MeetingProviderConfiguration.objects.get(id=provider_id)
        except MeetingProviderConfiguration.DoesNotExist:
            return Response({'error': 'Meeting provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        provider.status = 'inactive' if provider.status == 'active' else 'active'
        provider.save(update_fields=['status', 'updated_at'])
        _audit_admin_action(
            request,
            'meeting_provider_toggle',
            {'provider_id': str(provider.id), 'new_status': provider.status},
        )
        return Response({'status': provider.status})


class MeetingProviderTestView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = MeetingProviderConfiguration.objects.get(id=provider_id)
        except MeetingProviderConfiguration.DoesNotExist:
            return Response({'error': 'Meeting provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        missing = [
            label for label, value in [
                ('base_url', provider.base_url),
                ('api_key', provider.api_key),
                ('webhook_url', provider.webhook_url),
                ('webhook_secret', provider.webhook_secret),
            ] if not value
        ]
        success = not missing
        provider.last_tested_at = timezone.now()
        provider.last_test_status = 'ready' if success else 'error'
        provider.last_test_message = (
            'Configuration is ready for meeting provider API handshake.'
            if success
            else f"Missing required fields: {', '.join(missing)}."
        )
        if not success:
            provider.status = 'error'
        provider.save(update_fields=[
            'last_tested_at', 'last_test_status', 'last_test_message',
            'status', 'updated_at',
        ])
        _audit_admin_action(
            request,
            'meeting_provider_test',
            {'provider_id': str(provider.id), 'success': success},
        )
        return Response({
            'success': success,
            'status': provider.last_test_status,
            'message': provider.last_test_message,
            'missing': missing,
        })


class NotificationProviderListView(APIView):
    """
    GET/POST /api/v1/admin-portal/superadmin/notification-providers/
    SMS/OTP delivery rail (Africa's Talking first) — console-managed.
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = NotificationProviderConfiguration.objects.all()
        serializer = NotificationProviderConfigurationSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    def post(self, request):
        serializer = NotificationProviderConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.save(configured_by=request.user)
        _audit_admin_action(
            request,
            'notification_provider_create',
            {
                'provider_id': str(provider.id),
                'provider_code': provider.provider_code,
                'environment': provider.environment,
            },
        )
        return Response(
            NotificationProviderConfigurationSerializer(provider).data,
            status=status.HTTP_201_CREATED,
        )


class NotificationProviderDetailView(APIView):
    """PATCH/DELETE /api/v1/admin-portal/superadmin/notification-providers/<id>/"""
    permission_classes = [IsSuperAdmin]

    def _get_object(self, provider_id):
        try:
            return NotificationProviderConfiguration.objects.get(id=provider_id)
        except NotificationProviderConfiguration.DoesNotExist:
            return None

    def patch(self, request, provider_id):
        provider = self._get_object(provider_id)
        if provider is None:
            return Response({'error': 'Notification provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = NotificationProviderConfigurationSerializer(provider, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        provider = serializer.save()
        _audit_admin_action(
            request,
            'notification_provider_update',
            {'provider_id': str(provider.id), 'provider_code': provider.provider_code},
        )
        return Response(NotificationProviderConfigurationSerializer(provider).data)

    def delete(self, request, provider_id):
        provider = self._get_object(provider_id)
        if provider is None:
            return Response({'error': 'Notification provider not found.'}, status=status.HTTP_404_NOT_FOUND)
        metadata = {'provider_id': str(provider.id), 'provider_code': provider.provider_code}
        provider.delete()
        _audit_admin_action(request, 'notification_provider_delete', metadata)
        return Response({'message': 'Notification provider removed.'})


class NotificationProviderToggleView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = NotificationProviderConfiguration.objects.get(id=provider_id)
        except NotificationProviderConfiguration.DoesNotExist:
            return Response({'error': 'Notification provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        provider.status = 'inactive' if provider.status == 'active' else 'active'
        provider.save(update_fields=['status', 'updated_at'])
        _audit_admin_action(
            request,
            'notification_provider_toggle',
            {'provider_id': str(provider.id), 'new_status': provider.status},
        )
        return Response({'status': provider.status})


class NotificationProviderTestView(APIView):
    """
    POST /api/v1/admin-portal/superadmin/notification-providers/<id>/test/
    Field-completeness check; when body includes test_phone, also attempts a
    REAL SMS through this specific provider config.
    """
    permission_classes = [IsSuperAdmin]

    def post(self, request, provider_id):
        try:
            provider = NotificationProviderConfiguration.objects.get(id=provider_id)
        except NotificationProviderConfiguration.DoesNotExist:
            return Response({'error': 'Notification provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        missing = [
            label for label, value in [
                ('username', provider.username),
                ('api_key', provider.api_key),
            ] if not value
        ]
        success = not missing
        message = (
            'Configuration is ready for SMS delivery.'
            if success else
            f"Missing required fields: {', '.join(missing)}."
        )

        test_phone = str(request.data.get('test_phone') or '').strip()
        if success and test_phone:
            from apps.notifications.sms import SmsDeliveryError, send_via_config
            try:
                result = send_via_config(
                    provider, test_phone,
                    'OrbiSave test message — your SMS provider configuration works.',
                )
                message = f"Test SMS dispatched via {result['channel']} to {test_phone}."
            except SmsDeliveryError as exc:
                success = False
                message = f'Test SMS failed: {exc}'

        provider.last_tested_at = timezone.now()
        provider.last_test_status = 'ready' if success else 'error'
        provider.last_test_message = message
        if not success:
            provider.status = 'error'
        provider.save(update_fields=[
            'last_tested_at', 'last_test_status', 'last_test_message',
            'status', 'updated_at',
        ])
        _audit_admin_action(
            request,
            'notification_provider_test',
            {'provider_id': str(provider.id), 'success': success},
        )
        return Response({
            'success': success,
            'status': provider.last_test_status,
            'message': message,
            'missing': missing,
        })


class CountryPolicyListView(APIView):
    """
    GET/POST /api/v1/admin-portal/superadmin/country-policies/
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        qs = CountryPolicy.objects.all()
        serializer = CountryPolicySerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    def post(self, request):
        serializer = CountryPolicySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        policy = serializer.save(updated_by=request.user)
        _audit_admin_action(
            request,
            'country_policy_create',
            {
                'policy_id': str(policy.id),
                'country': policy.country,
                'max_loan_interest_rate_monthly': str(policy.max_loan_interest_rate_monthly),
            },
        )
        return Response(CountryPolicySerializer(policy).data, status=status.HTTP_201_CREATED)


class CountryPolicyDetailView(APIView):
    """
    PATCH /api/v1/admin-portal/superadmin/country-policies/<id>/
    """
    permission_classes = [IsSuperAdmin]

    def _get_object(self, policy_id):
        try:
            return CountryPolicy.objects.get(id=policy_id)
        except CountryPolicy.DoesNotExist:
            return None

    def patch(self, request, policy_id):
        policy = self._get_object(policy_id)
        if policy is None:
            return Response({'error': 'Country policy not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CountryPolicySerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        policy = serializer.save(updated_by=request.user)
        _audit_admin_action(
            request,
            'country_policy_update',
            {
                'policy_id': str(policy.id),
                'country': policy.country,
                'max_loan_interest_rate_monthly': str(policy.max_loan_interest_rate_monthly),
            },
        )
        return Response(CountryPolicySerializer(policy).data)

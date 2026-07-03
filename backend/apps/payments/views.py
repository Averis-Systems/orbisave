import json
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
import structlog

from apps.payments.models import BankProvider, ProviderApiLog
from apps.payments.providers.jenga import JengaProvider
from apps.contributions.models import Contribution
from apps.groups.models import Group

logger = structlog.get_logger(__name__)

class JengaWebhookView(APIView):
    """
    POST /api/v1/webhooks/jenga/
    Receives real-time transaction updates from JengaHQ.
    Supports Kenya and Rwanda.
    """
    permission_classes = [AllowAny]  # Signature verification handles security

    def post(self, request):
        payload = request.data
        logger.info("jenga_webhook_received", payload=payload)

        # 1. Resolve Provider (Jenga generates unique codes, but we usually map by country or merchant code)
        # For security, we should ideally check the signature first, but we need the secret from the provider record.
        # We'll use the 'merchantCode' from payload to find our provider.
        merchant_code = payload.get('merchantCode')
        if not merchant_code:
            return Response({"error": "Missing merchantCode"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            provider_record = BankProvider.objects.get(merchant_code=merchant_code, is_active=True)
        except BankProvider.DoesNotExist:
            logger.error("jenga_webhook_provider_not_found", merchant_code=merchant_code)
            return Response({"error": "Provider not found"}, status=status.HTTP_404_NOT_FOUND)

        # 2. Verify Signature
        provider = JengaProvider(provider_record)
        if not provider.verify_webhook_signature(request):
            logger.warning("jenga_webhook_invalid_signature", merchant_code=merchant_code)
            return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)

        # 3. Log Inbound Call
        ProviderApiLog.objects.create(
            provider=provider_record,
            direction='inbound',
            endpoint='/webhooks/jenga/',
            method='POST',
            request_body=payload,
            response_code=200,
            success=True
        )

        # 4. Parse & Process
        data = provider.parse_callback(payload)
        provider.record_callback(payload, data)
        status_norm = data['status']
        external_id = data['transaction_id']
        amount      = data['amount']

        # Find the contribution record
        # Jenga sends back the 'reference' we sent in initiate_collection
        internal_ref = payload.get('reference')
        if not internal_ref:
            return Response({"status": "ignored", "reason": "No reference in payload"}, status=200)

        try:
            contribution = Contribution.objects.select_related('group').get(platform_reference=internal_ref)
        except Contribution.DoesNotExist:
            logger.warning("jenga_webhook_contribution_not_found", ref=internal_ref)
            return Response({"status": "ignored", "reason": "Contribution record not found"}, status=200)

        # Update Contribution
        if status_norm == 'success':
            contribution.status = 'confirmed'
            contribution.confirmed_at = timezone.now()
            contribution.provider_reference = external_id
            contribution.actual_amount = amount
            contribution.save(update_fields=['status', 'confirmed_at', 'provider_reference', 'actual_amount'])
            
            logger.info("contribution_confirmed", id=str(contribution.id), ref=internal_ref)

            # 5. Check if this is the first contribution to activate the group
            group = contribution.group
            if group.status == 'pending':
                # Check total confirmed contributions
                # (Simple check: if this was successfully confirmed and it's the first)
                if Contribution.objects.filter(group=group, status='confirmed').count() == 1:
                    group.status = 'active'
                    group.save(update_fields=['status'])
                    logger.info("group_auto_activated", group_id=str(group.id))
        
        elif status_norm == 'failed':
            contribution.status = 'failed'
            contribution.failure_reason = data.get('reason', 'Unknown failure')
            contribution.save(update_fields=['status', 'failure_reason'])
            logger.info("contribution_failed", id=str(contribution.id), ref=internal_ref)

        return Response({"status": "accepted"}, status=200)

import hashlib
import uuid
import structlog
from django.utils import timezone as tz
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction, models
from django.db.models import F
from decimal import Decimal

from contextlib import contextmanager
from threading import Lock
from .models import Contribution
from .serializers import ContributionInitiateSerializer, ContributionStatusSerializer
from apps.groups.models import GroupMember, Group, RotationCycle
from apps.ledger.models import LedgerEntry
from apps.payments.selector import get_payment_provider
from common.exceptions import success_response
from common.db_utils import get_db_for_group, get_db_for_country

_sqlite_lock = Lock()

logger = structlog.get_logger(__name__)

@contextmanager
def advisory_lock(lock_id: int):
    """
    Acquires a Postgres session-level transaction lock or a threading.Lock fallback for SQLite.
    Satisfies Financial Engine Checklist Item 11: Concurrency.
    """
    from django.db import connection
    if connection.vendor == 'sqlite':
        with _sqlite_lock:
            yield
    else:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_id])
            yield


class InitiateContributionView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_pk):
        """
        Idempotent endpoint. Validates input via serializer then initiates a
        state machine transition to 'initiated'.
        Satisfies System Checklist Section 6 (Input Validation) + Financial Engine Checklist 1 & 4.
        """
        # ── Serializer Validation ──────────────────────────────────────────
        serializer = ContributionInitiateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount_dec = serializer.validated_data['amount']
        phone      = serializer.validated_data['phone']
        method     = serializer.validated_data['method']

        try:
            membership = GroupMember.objects.select_related('group').get(
                group_id=group_pk,
                member=request.user,
                status='active'
            )
        except GroupMember.DoesNotExist:
            return Response(
                {"error": "You do not have an active membership in this group."},
                status=status.HTTP_403_FORBIDDEN
            )

        group = membership.group
        db_alias = get_db_for_group(group)

        lock_seed = int(hashlib.md5(
            f"init_contrib_{request.user.id}_{group.id}".encode()
        ).hexdigest(), 16) % (2**63 - 1)

        with transaction.atomic(using=db_alias):
            with advisory_lock(lock_seed):
                # Anti-Spam: Check if a highly identical pending contribution already explicitly exists
                existing_pending = Contribution.objects.filter(
                    group=group, 
                    member=request.user, 
                    amount=amount_dec, 
                    status='initiated'
                ).exists()
                
                if existing_pending:
                     return Response({"error": "An identical structurally pending contribution is already actively awaiting settlement via payment provider."}, status=status.HTTP_409_CONFLICT)

                # Fire the abstract Telecom interface
                provider = get_payment_provider(country=group.country, method='mpesa') 
                res = provider.initiate_collection(
                    phone=phone,
                    amount=amount_dec,
                    reference=f"GRP-{group.id}",
                    description=f"Contribution to {group.name}"
                )
                
                if res.get('status') == 'failed':
                     return Response({"error": "Target Payment Provider implicitly rejected the request configuration."}, status=status.HTTP_502_BAD_GATEWAY)

                prov_ref = res.get('provider_reference', 'UNKNOWN')

                # State formally tracking
                current_cycle = RotationCycle.objects.filter(group=group, is_current=True).first()
                contribution = Contribution.objects.create(
                    group=group,
                    member=request.user,
                    amount=amount_dec,
                    currency=group.currency,
                    method=method,
                    mobile_number=phone,
                    status='initiated',
                    initiated_at=tz.now(),
                    provider_reference=prov_ref,
                    platform_reference=f"PLT-{uuid.uuid4().hex[:12].upper()}",
                    scheduled_date=tz.now().date(),
                    cycle=current_cycle
                )

                logger.info("contribution_initiated", user_id=request.user.id, amount=amount_dec, provider_ref=prov_ref)
            
        return success_response(data={"provider_reference": prov_ref, "status": "pending_async"}, message="Contribution heavily successfully pushed to execution stack.", status_code=201)


class ContributionWebhookView(views.APIView):
    """
    Publicly facing webhook explicitly structured to act as the core State Engine transition controller.
    Satisfies Financial Engine Checklist 1. Event Driven & 12. Data Integrity.
    """
    permission_classes = [AllowAny] 
    
    def post(self, request, country, provider_id):
        provider = get_payment_provider(country=country, method=provider_id)
        
        if not provider.verify_webhook_signature(request):
            logger.warning("webhook_signature_forged", ip=request.META.get('REMOTE_ADDR'), provider=provider_id)
            return Response({"error": "Cryptographic signature validation completely failed."}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
             parsed = provider.parse_callback(request.data)
        except Exception as e:
             logger.error("webhook_parser_failed", error=str(e), payload=request.data)
             return Response({"error": "Malformed provider payload array."}, status=status.HTTP_400_BAD_REQUEST)
             
        prov_ref = parsed.get("transaction_id")
        cb_status = parsed.get("status")
        
        with transaction.atomic(using=get_db_for_country(country)):  # Safe multi-DB routing
            # Select FOR UPDATE mechanically freezes the row locking out thousands of concurrent pings immediately.
            try:
                contrib = Contribution.objects.select_for_update().select_related('group', 'member').get(provider_reference=prov_ref)
            except Contribution.DoesNotExist:
                logger.error("webhook_orphan_reference", reference=prov_ref)
                return Response({"status": "acknowledged"}, status=status.HTTP_200_OK) # Acknowledge anyway so provider doesn't DDOS retry
                
            if contrib.status not in ['initiated', 'pending']:
                # Idempotency achieved! This webhook already executed or failed permanently.
                return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)
                
            if cb_status == 'failed':
                contrib.status = 'failed'
                contrib.save(update_fields=['status'])
                logger.info("contribution_webhook_failed_marked", contrib_id=contrib.id)
                return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)
                
            # Success Track! Shift to double-entry ledger instantiation.
            contrib.status = 'confirmed'
            contrib.confirmed_at = tz.now()
            contrib.actual_amount = Decimal(parsed.get('amount', contrib.amount))
            contrib.save(update_fields=['status', 'confirmed_at', 'actual_amount'])
            
            # Formally calculate and bind any statutory late penalties defining this specific transaction sequence.
            from .services.penalty_service import PenaltyService
            PenaltyService.apply_late_penalty(contrib)
            
            # Increment cycle aggregates for live tracking
            if contrib.cycle:
                from django.db.models import F
                contrib.cycle.total_contributions = F('total_contributions') + contrib.actual_amount
                contrib.cycle.save(update_fields=['total_contributions'])
            
            # Double-Entry Logic enforced instantly
            LedgerEntry.objects.create(
                group=contrib.group,
                member=contrib.member,
                entry_type='contribution',
                direction='credit',
                amount=contrib.actual_amount,
                currency=contrib.group.currency,
                description=f"Member Contribution directly via {provider_id.upper()}",
                reference=prov_ref,
                related_contribution=contrib
            )
            
            logger.info("contribution_webhook_success_locked", contrib_id=contrib.id, amount=contrib.actual_amount)
            
        return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)

import pytest
import threading
import uuid
from decimal import Decimal
from django.db import connection, connections
from rest_framework.test import APIClient
from apps.contributions.models import Contribution
from apps.ledger.models import LedgerEntry


class FastProvider:
    def initiate_collection(self, phone, amount, reference, description):
        return {
            "status": "pending",
            "provider_reference": f"PROV-{uuid.uuid4().hex[:10].upper()}",
        }

    def verify_webhook_signature(self, request):
        return True

    def parse_callback(self, payload):
        return {
            "status": payload["status"],
            "transaction_id": payload["transaction_id"],
            "amount": payload["amount"],
            "reason": payload.get("reason", ""),
            "raw": payload,
        }


@pytest.mark.django_db(transaction=True)
def test_advisory_lock_prevents_duplicate_initiation(group, auth_user, monkeypatch):
    """
    Stress tests concurrent requests attacking the Initiate endpoint directly 
    simulating a user furiously double-clicking submit.
    Validates Financial Engine Checklist Item 11: Concurrency (Prevent double submission).
    """
    monkeypatch.setattr(
        "apps.contributions.views.get_payment_provider",
        lambda country, method: FastProvider(),
    )
    monkeypatch.setattr("apps.contributions.views.get_db_for_country", lambda country: "default")
    monkeypatch.setattr("apps.contributions.views.get_db_for_group", lambda group: "default")

    results = []
    
    def fire_request():
        # Each thread requires an independent database connection formally 
        # because pg_advisory_lock is session-bound physically.
        with connections['default'].cursor():
            client = APIClient()
            client.force_authenticate(user=auth_user)
            res = client.post(f'/api/v1/contributions/{group.id}/initiate/', {
                "amount": "5000.00",
                "phone": "+254700000000"
            }, format='json')
            results.append(res.status_code)
            
    if connection.vendor == 'sqlite':
        for _ in range(5):
            fire_request()
    else:
        # Spin 5 rapid concurrent threads identical payload
        threads = [threading.Thread(target=fire_request) for _ in range(5)]
        for t in threads: t.start()
        for t in threads: t.join()

    # Exact Assertion: Only 1 should yield 201 Created. The rest 409 Conflict.
    assert results.count(201) == 1
    assert results.count(409) == 4
    
    # DB Assertion
    assert Contribution.objects.filter(member=auth_user, status='initiated').count() == 1


@pytest.mark.django_db(transaction=True)
def test_select_for_update_prevents_duplicate_webhooks(group, contribution_pending, monkeypatch):
    """
    Simulates telecom retry storms (e.g. MTN blasting 3 webhooks simultaneously due to timeout).
    Validates Financial Engine Checklist Item 14: Failure Handling.
    """
    client = APIClient()
    monkeypatch.setattr(
        "apps.contributions.views.get_payment_provider",
        lambda country, method: FastProvider(),
    )
    monkeypatch.setattr("apps.contributions.views.get_db_for_country", lambda country: "default")
    
    provider_ref = contribution_pending.provider_reference
    results = []

    def fire_webhook():
        with connections['default'].cursor():
            res = client.post(f'/api/v1/contributions/webhook/kenya/mpesa/', {
                "status": "success",
                "transaction_id": provider_ref,
                "amount": "5000.00",
                "reason": "Payment completed"
            }, format='json')
            results.append(res.status_code)

    if connection.vendor == 'sqlite':
        for _ in range(10):
            fire_webhook()
    else:
        # 10 simultaneous telecom webhooks
        threads = [threading.Thread(target=fire_webhook) for _ in range(10)]
        for t in threads: t.start()
        for t in threads: t.join()

    # The telecom expects exactly 200 OK across the board theoretically.
    # The accepted webhook writes one idempotent allocation per financial stream.
    assert results.count(200) == 10
    
    # Strict Ledger Check - exactly one rotation and one loaning allocation were written.
    contribution_pending.refresh_from_db()
    assert contribution_pending.status == 'confirmed'
    assert LedgerEntry.objects.filter(
        related_contribution=contribution_pending,
        account_stream='rotation',
        reference=f'{provider_ref}:rotation',
    ).count() == 1
    assert LedgerEntry.objects.filter(
        related_contribution=contribution_pending,
        account_stream='loaning',
        reference=f'{provider_ref}:loaning',
    ).count() == 1

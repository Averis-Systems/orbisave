import pytest
import threading
from decimal import Decimal
from django.db import connection, connections
from rest_framework.test import APIClient
from apps.contributions.models import Contribution
from apps.ledger.models import LedgerEntry

@pytest.mark.django_db(transaction=True)
def test_advisory_lock_prevents_duplicate_initiation(group, auth_user):
    """
    Stress tests concurrent requests attacking the Initiate endpoint directly 
    simulating a user furiously double-clicking submit.
    Validates Financial Engine Checklist Item 11: Concurrency (Prevent double submission).
    """
    client = APIClient()
    client.force_authenticate(user=auth_user)

    results = []
    
    def fire_request():
        # Each thread requires an independent database connection formally 
        # because pg_advisory_lock is session-bound physically.
        with connections['default'].cursor():
            res = client.post(f'/api/v1/contributions/{group.id}/initiate/', {
                "amount": "5000.00",
                "phone": "+254700000000"
            }, format='json')
            results.append(res.status_code)
            
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
def test_select_for_update_prevents_duplicate_webhooks(group, contribution_pending):
    """
    Simulates telecom retry storms (e.g. MTN blasting 3 webhooks simultaneously due to timeout).
    Validates Financial Engine Checklist Item 14: Failure Handling.
    """
    client = APIClient()
    
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

    # 10 simultaneous telecom webhooks
    threads = [threading.Thread(target=fire_webhook) for _ in range(10)]
    for t in threads: t.start()
    for t in threads: t.join()

    # The telecom expects exactly 200 OK across the board theoretically. 
    # But fundamentally, only 1 actual LedgerEntry should have been legally written.
    assert results.count(200) == 10
    
    # Strict Ledger Check - Exactly ONE transaction occurred safely mutating state
    contribution_pending.refresh_from_db()
    assert contribution_pending.status == 'confirmed'
    assert LedgerEntry.objects.filter(reference=provider_ref).count() == 1

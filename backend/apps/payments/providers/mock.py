import uuid
from decimal import Decimal
from typing import Dict, Any
from apps.payments.base import PaymentProvider

class MockProvider(PaymentProvider):
    """
    Sandboxed instant-success provider natively validating Engine state flows
    without triggering physical telecom hardware delays.
    """
    def initiate_collection(self, phone: str, amount: Decimal, reference: str, description: str) -> Dict[str, Any]:
        val = str(uuid.uuid4())
        return {
            "status": "pending_async",
            "provider_reference": f"MOCK-COL-{val}"
        }

    def initiate_disbursement(self, phone: str, amount: Decimal, reference: str, remarks: str) -> Dict[str, Any]:
        val = str(uuid.uuid4())
        return {
            "status": "success",
            "provider_reference": f"MOCK-DIS-{val}"
        }

    def parse_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        # Typically called internally via testing suites since mock 
        # doesn't natively fire real http requests back to the server
        val = str(uuid.uuid4())
        return {
            "status": payload.get("status", "success"),
            "transaction_id": payload.get("transaction_id", f"MOCK-CB-{val}"),
            "amount": payload.get("amount", "0.00"),
            "reason": payload.get("reason", "Mock processed successfully.")
        }
        
    def verify_webhook_signature(self, request) -> bool:
        # Sandboxed mock implicitly universally validates theoretically attached signatures
        return True

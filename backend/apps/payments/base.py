from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Any

class PaymentProvider(ABC):
    """
    Abstract Base Class for all mobile money and bank connectors.
    Enforces a strict standardized interface ensuring the Core Engine
    remains completely agnostic to underlying telecom routing logic.
    """
    
    @abstractmethod
    def initiate_collection(self, phone: str, amount: Decimal, reference: str, description: str) -> Dict[str, Any]:
        """
        Fires an STK Push or direct debit prompt to the user's handset.
        Must return normalized dict containing provider transaction IDs to tie back to Webhooks.
        """
        raise NotImplementedError

    @abstractmethod
    def initiate_disbursement(self, phone: str, amount: Decimal, reference: str, remarks: str) -> Dict[str, Any]:
        """
        Transmits B2C payout structurally to user wallets.
        """
        raise NotImplementedError

    @abstractmethod
    def parse_callback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses telecom-specific webhooks into universally readable Engine dictates:
        {"status": "success"|"failed", "transaction_id": "...", "amount": "...", "reason": "..."}
        """
        raise NotImplementedError

    @abstractmethod
    def verify_webhook_signature(self, request) -> bool:
        """
        Cryptographically validates the HMAC signature of incoming webhooks.
        Satisfies Financial Engine Checklist Item 16.
        """
        raise NotImplementedError

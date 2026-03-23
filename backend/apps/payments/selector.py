import os
from .base import PaymentProvider

def get_payment_provider(country: str, method: str) -> PaymentProvider:
    """
    Intelligent factory router. Immediately falls back to Mock logic if ENV specifies sandbox explicitly, 
    otherwise loads up the required geo-fenced payment abstraction class.
    """
    from .providers.mock import MockProvider
    
    # Fast bypass for deep testing or local dev
    if os.environ.get('MPESA_ENVIRONMENT', 'sandbox') == 'sandbox' and os.environ.get('MTN_ENVIRONMENT', 'sandbox') == 'sandbox':
         return MockProvider()
         
    # Currently pointing Live logic primarily towards Mocking until physical classes are established.
    # Replace these direct dictionaries with real provider files (MpesaProvider / MTNProvider) in prod deployment.
    providers = {
        ('kenya', 'mpesa'): MockProvider,
        ('kenya', 'airtel'): MockProvider,
        ('rwanda', 'mtn_momo'): MockProvider,
        ('ghana', 'mtn_momo'): MockProvider,
    }
    
    cls = providers.get((country, method))
    if not cls:
        raise ValueError(f"CRUCIAL SYSTEM FAILURE: No provider architecture explicitly mapped for {country}/{method}")
    
    return cls()

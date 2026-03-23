import threading

_thread_locals = threading.local()

def get_current_country():
    return getattr(_thread_locals, 'country', 'default')

def set_current_country(country):
    _thread_locals.country = country

class CountryMiddleware:
    """
    Extracts the country context from the request (e.g., from a header X-Country or user profile)
    and stores it in thread-local storage for use by the database router.
    NOTE: Financial service methods MUST explicitly pass using(country) and not rely solely on this.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Determine country from header or query param. Default to 'default' database.
        country = request.headers.get('X-Country', 'default').lower()
        if country in ['kenya', 'rwanda', 'ghana']:
            set_current_country(country)
        else:
            set_current_country('default')
            
        response = self.get_response(request)
        
        # Cleanup
        if hasattr(_thread_locals, 'country'):
            del _thread_locals.country
            
        return response

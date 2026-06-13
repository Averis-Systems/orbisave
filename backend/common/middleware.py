import threading

_thread_locals = threading.local()

def get_current_country():
    return getattr(_thread_locals, 'country', 'default')

def set_current_country(country):
    _thread_locals.country = country

class CountryMiddleware:
    """
    Stores country context in thread-local storage for the database router.

    Authenticated requests must derive country from server-owned user data.
    X-Country is only accepted for anonymous/public context where no trusted user
    country exists yet.

    NOTE: Financial service methods MUST explicitly pass using(country) and not rely solely on this.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        allowed_countries = ['kenya', 'rwanda', 'ghana']
        header_country = request.headers.get('X-Country', '').lower()
        country = 'default'

        user = getattr(request, 'user', None)
        if user and getattr(user, 'is_authenticated', False) and getattr(user, 'country', None) in allowed_countries:
            country = user.country
        elif header_country in allowed_countries:
            country = header_country

        set_current_country(country)
            
        response = self.get_response(request)
        
        # Cleanup
        if hasattr(_thread_locals, 'country'):
            del _thread_locals.country
            
        return response

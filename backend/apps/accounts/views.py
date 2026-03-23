import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
import structlog
from .serializers import RegisterSerializer, UserSerializer

logger = structlog.get_logger(__name__)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserMeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response(UserSerializer(request.user).data)

def generate_jwt_for_user(user):
    """
    Generate an RS256 signed JWT for the user.
    """
    now = datetime.now(timezone.utc)
    # Using small lifetime (15 mins) for max security as Better Auth manages the refresh on Next.js
    payload = {
        'sub': str(user.id),
        'role': user.role,
        'email': user.email,
        'iat': now,
        'exp': now + timedelta(minutes=15),
        'iss': 'orbisave_django',
        'aud': 'orbisave_api',
    }
    # Loaded dynamically from ENV, never hardcoded.
    private_key = getattr(settings, 'JWT_PRIVATE_KEY', None)
    if not private_key:
        logger.error("missing_jwt_private_key")
        raise RuntimeError("JWT_PRIVATE_KEY is not configured.")

    token = jwt.encode(payload, private_key, algorithm='RS256')
    return token

class TokenObtainPairView(APIView):
    """
    Receives email and password or phone and password,
    returns an RS256 JWT for Better Auth to consume.
    """
    permission_classes = [AllowAny]

    # Extremely aggressive rate limiting to prevent brute forcing (Redis backed)
    # Allows 10 login attempts per IP per 5 minutes.
    @method_decorator(ratelimit(key='ip', rate='10/5m', method='POST', block=True))
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        phone = request.data.get('phone')
        password = request.data.get('password')

        if not password or (not email and not phone):
            return Response(
                {"error": "Must include 'email' or 'phone' and 'password'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # authenticate will check the DB on the default database.
        user = None
        if email:
            user = authenticate(request, email=email, password=password)
        # Assuming we wrote a custom backend for phone, else we query user then check pass
        elif phone:
            from apps.accounts.models import User
            try:
                user_obj = User.objects.get(phone=phone)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                pass

        if user is None:
            logger.info("failed_login_attempt", email=email, ip=request.META.get('REMOTE_ADDR'))
            return Response(
                {"error": "Invalid credentials."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {"error": "Account is disabled."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            token = generate_jwt_for_user(user)
        except RuntimeError as e:
            return Response({"error": "Internal server configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Log successful login to the unmodifiable AuditLog immediately
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            action='user_login',
            actor=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response({"access_token": token})

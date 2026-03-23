import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
import structlog

logger = structlog.get_logger(__name__)
User = get_user_model()

class RS256JWTAuthentication(BaseAuthentication):
    """
    Stateless JWT Authentication using RS256 public key cryptography.
    The Next.js Better Auth layer holds the session, and sends the JWT as a Bearer token
    or via an encrypted cookie. Django simply verifies the signature using the Public Key.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]

        try:
            # Note: settings.JWT_PUBLIC_KEY must be loaded from env securely
            payload = jwt.decode(
                token,
                settings.JWT_PUBLIC_KEY,
                algorithms=['RS256'],
                audience='orbisave_api'
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError as e:
            logger.warning("invalid_jwt_token", error=str(e), ip=request.META.get('REMOTE_ADDR'))
            raise AuthenticationFailed('Invalid token.')

        user_id = payload.get('sub')
        if not user_id:
            raise AuthenticationFailed('Token contained no recognizable user identity.')

        # In a fully stateless design, we might not even query the DB here if we trust the token payload 
        # completely padding it with roles/permissions. However, to ensure the user isn't suspended,
        # we do a minimalist query.
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found or is inactive.')

        return (user, payload)

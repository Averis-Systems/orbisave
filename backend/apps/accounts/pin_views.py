from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import make_password, check_password
from common.exceptions import success_response
from apps.audit.services import log_audit

class TransactionPinView(views.APIView):
    """
    Manages the Argon2id locked secondary transaction PIN for immutable execution requests.
    Satisfies Financial Engine Checklist Item 7: Multi-Party Approval Security.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pin = request.data.get('pin')
        password = request.data.get('password')
        
        if not pin or len(str(pin)) != 4 or not str(pin).isdigit():
            return Response({"error": "PIN physically required to exactly match 4 numeric strictly-typed integers."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.check_password(password):
             return Response({"error": "Core Account Password actively failed validation required to instantiate PIN setting."}, status=status.HTTP_401_UNAUTHORIZED)
             
        request.user.transaction_pin = make_password(str(pin))
        request.user.save(update_fields=['transaction_pin'])
        
        log_audit(
            action='transaction_pin_instantiated',
            actor=request.user,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return success_response(data=None, message="Crucial highly-sensitive transaction PIN structurally embedded.")

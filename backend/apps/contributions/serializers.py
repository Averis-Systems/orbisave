from rest_framework import serializers
from django.utils import timezone
from .models import Contribution, Penalty


# ─────────────────────────────────────────────────────────
# Input Serializer: Contribution initiation (from frontend)
# ─────────────────────────────────────────────────────────

class ContributionInitiateSerializer(serializers.Serializer):
    """
    Validates the request body sent by the frontend to initiate a contribution.
    Satisfies frontend checklist Section 13 (API Integration) + System Checklist Section 6 (Input Validation).
    """
    ALLOWED_METHODS = ['mpesa', 'airtel', 'mtn_momo', 'bank']

    amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value='1.00',
        error_messages={
            'min_value': 'Contribution amount must be at least 1.00.',
            'invalid': 'Enter a valid monetary amount.',
        }
    )
    phone = serializers.CharField(
        max_length=20,
        error_messages={'required': 'A mobile phone number is required.'}
    )
    method = serializers.ChoiceField(
        choices=ALLOWED_METHODS,
        default='mpesa',
    )

    def validate_phone(self, value: str) -> str:
        """Enforce E.164-style phone numbers (+ prefix, digits only)."""
        import re
        cleaned = value.strip()
        if not re.match(r'^\+?[1-9]\d{7,14}$', cleaned):
            raise serializers.ValidationError(
                'Phone number must be in international format, e.g. +254712345678.'
            )
        return cleaned

    def validate_amount(self, value):
        from decimal import Decimal
        if value <= Decimal('0'):
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value


# ─────────────────────────────────────────────────────────
# Output Serializer: Contribution status for frontend
# ─────────────────────────────────────────────────────────

class ContributionStatusSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    group_name  = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = Contribution
        fields = [
            'id', 'platform_reference', 'provider_reference',
            'amount', 'actual_amount', 'currency', 'method',
            'status', 'scheduled_date', 'initiated_at', 'confirmed_at',
            'failure_reason', 'retry_count', 'member_name', 'group_name',
        ]
        read_only_fields = fields


# ─────────────────────────────────────────────────────────
# Output Serializer: Penalty detail
# ─────────────────────────────────────────────────────────

class PenaltySerializer(serializers.ModelSerializer):
    rule_type    = serializers.CharField(source='rule.rule_type', read_only=True)
    penalty_type = serializers.CharField(source='rule.penalty_type', read_only=True)

    class Meta:
        model = Penalty
        fields = ['id', 'amount', 'status', 'rule_type', 'penalty_type', 'paid_at', 'payment_reference']
        read_only_fields = fields

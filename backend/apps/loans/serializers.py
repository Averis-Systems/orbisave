from rest_framework import serializers
from .models import Loan, LoanRepayment


# ─────────────────────────────────────────────────────────
# Input: Loan Request from a member
# ─────────────────────────────────────────────────────────

class LoanRequestSerializer(serializers.Serializer):
    """
    Validates the loan request body sent by the frontend.
    Satisfies Financial Engine Checklist Section 7 (Loan Engine) + System Checklist Section 6.
    """
    ALLOWED_PURPOSES = [
        'business', 'education', 'medical', 'agriculture',
        'home_improvement', 'personal', 'other',
    ]

    amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value='1.00',
        error_messages={'min_value': 'Loan amount must be at least 1.00.'}
    )
    purpose = serializers.ChoiceField(choices=ALLOWED_PURPOSES)
    purpose_detail = serializers.CharField(
        max_length=1000, required=False, allow_blank=True, default=''
    )
    term_weeks = serializers.IntegerField(
        min_value=1, max_value=104,
        error_messages={
            'min_value': 'Loan term must be at least 1 week.',
            'max_value': 'Loan term cannot exceed 104 weeks (2 years).',
        }
    )

    def validate_amount(self, value):
        from decimal import Decimal
        if value <= Decimal('0'):
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value


# ─────────────────────────────────────────────────────────
# Input: Loan approval PIN
# ─────────────────────────────────────────────────────────

class LoanApprovalSerializer(serializers.Serializer):
    """PIN-authenticated loan approval request."""
    pin = serializers.CharField(
        min_length=4, max_length=6, write_only=True,
        error_messages={
            'required': 'Transaction PIN is required to authorise this action.',
            'min_length': 'PIN must be at least 4 digits.',
        }
    )

    def validate_pin(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError('PIN must contain digits only.')
        return value


# ─────────────────────────────────────────────────────────
# Output: Loan detail for frontend dashboard
# ─────────────────────────────────────────────────────────

class LoanRepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanRepayment
        fields = [
            'id', 'due_date', 'principal_amount', 'interest_amount',
            'total_due', 'amount_paid', 'status', 'paid_at',
        ]
        read_only_fields = fields


class LoanDetailSerializer(serializers.ModelSerializer):
    borrower_name    = serializers.CharField(source='borrower.full_name', read_only=True)
    group_name       = serializers.CharField(source='group.name', read_only=True)
    repayments       = LoanRepaymentSerializer(many=True, read_only=True)
    outstanding_weeks = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = [
            'id', 'group_name', 'borrower_name', 'amount', 'currency',
            'interest_rate_monthly', 'term_weeks', 'purpose', 'purpose_detail',
            'status', 'disbursed_at', 'fully_repaid_at', 'outstanding_weeks',
            'repayments',
        ]
        read_only_fields = fields

    def get_outstanding_weeks(self, obj) -> int:
        return obj.repayments.filter(status='upcoming').count()


class LoanListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    borrower_name = serializers.CharField(source='borrower.full_name', read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'borrower_name', 'amount', 'currency',
            'interest_rate_monthly', 'status', 'disbursed_at',
        ]
        read_only_fields = fields

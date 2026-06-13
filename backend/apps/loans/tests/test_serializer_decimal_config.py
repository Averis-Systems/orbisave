from decimal import Decimal

from apps.loans.serializers import LoanRequestSerializer


def test_loan_amount_min_value_uses_decimal_instance():
    serializer = LoanRequestSerializer()
    assert serializer.fields["amount"].min_value == Decimal("1.00")


from decimal import Decimal

from apps.contributions.serializers import ContributionInitiateSerializer


def test_contribution_amount_min_value_uses_decimal_instance():
    serializer = ContributionInitiateSerializer()
    assert serializer.fields["amount"].min_value == Decimal("1.00")


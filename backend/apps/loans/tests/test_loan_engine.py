"""
Loan Engine test suite.
Tests the deterministic 3-party approval state machine.
Satisfies Financial Engine Checklist §7 (Loan Approval Flow).
"""
import pytest
from decimal import Decimal
from django.contrib.auth.hashers import make_password


@pytest.mark.django_db
class TestLoanEngine:

    def test_chair_approves_loan_to_pending_treasurer(
        self, loan_pending_chair, chairperson, group_with_treasurer
    ):
        """
        Chairperson with valid PIN approves a loan.
        Since a treasurer exists, status must transition to 'pending_treasurer'.
        """
        from apps.loans.services.loan_engine import LoanEngine

        result = LoanEngine.approve_loan(
            loan=loan_pending_chair,
            authorizing_member=chairperson,
            provided_pin='1234',  # Matches make_password('1234') in fixture
        )

        assert result.status == 'pending_treasurer'
        assert result.chair_approved_by == chairperson
        assert result.chair_approved_at is not None

    def test_chair_approves_loan_directly_when_no_treasurer(
        self, loan_pending_chair, chairperson, group
    ):
        """
        When no treasurer is assigned, approval by chairperson jumps straight to 'approved'.
        """
        from apps.loans.services.loan_engine import LoanEngine

        # Ensure no treasurer on this group
        group.treasurer = None
        group.save(update_fields=['treasurer'])

        result = LoanEngine.approve_loan(
            loan=loan_pending_chair,
            authorizing_member=chairperson,
            provided_pin='1234',
        )

        assert result.status == 'approved'

    def test_wrong_pin_raises_permission_error(self, loan_pending_chair, chairperson):
        """Providing a wrong PIN must raise PermissionError — no state change."""
        from apps.loans.services.loan_engine import LoanEngine

        with pytest.raises(PermissionError, match="PIN verification failed"):
            LoanEngine.approve_loan(
                loan=loan_pending_chair,
                authorizing_member=chairperson,
                provided_pin='9999',  # Wrong PIN
            )

        loan_pending_chair.refresh_from_db()
        assert loan_pending_chair.status == 'pending_chair'  # Must not have changed

    def test_wrong_role_cannot_approve(self, loan_pending_chair, user, group_member):
        """
        A regular member (not chairperson) cannot approve at pending_chair stage.
        Must raise PermissionError.
        """
        from apps.loans.services.loan_engine import LoanEngine

        with pytest.raises(PermissionError, match="Only the chairperson"):
            LoanEngine.approve_loan(
                loan=loan_pending_chair,
                authorizing_member=user,
                provided_pin='1234',
            )

        loan_pending_chair.refresh_from_db()
        assert loan_pending_chair.status == 'pending_chair'

    def test_interest_rate_cap_enforced(self, group, user, group_member):
        """
        Creating a loan with interest_rate_monthly > 30 must raise ValidationError.
        Satisfies Financial Engine Checklist §7: Upper cap (anti-exploitation).
        """
        from apps.loans.models import Loan
        from django.core.exceptions import ValidationError

        loan = Loan(
            group=group,
            borrower=user,
            amount=Decimal('10000.00'),
            currency='KES',
            interest_rate_monthly=Decimal('35.00'),  # Exceeds 30% cap
            term_weeks=12,
            purpose='Over-priced loan attempt',
        )

        with pytest.raises(ValidationError, match="exceeds the maximum"):
            loan.full_clean()

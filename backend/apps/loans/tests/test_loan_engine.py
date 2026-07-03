"""
Loan Engine test suite.
Tests the deterministic 3-party approval state machine.
Satisfies Financial Engine Checklist §7 (Loan Approval Flow).
"""
import pytest
from decimal import Decimal
from django.contrib.auth.hashers import make_password

pytestmark = pytest.mark.django_db(databases=["default", "kenya"])

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

    def test_chair_approves_loan_to_pending_admin_when_no_treasurer(
        self, loan_pending_chair, chairperson, group
    ):
        """
        When no treasurer is assigned, chair approval still requires platform-admin review.
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

        assert result.status == 'pending_admin'

    def test_treasurer_approval_moves_to_pending_admin_without_disbursement_ledger(
        self, group_with_treasurer, approved_loan, treasurer
    ):
        """
        Treasurer approval must not create disbursement ledger entries or repayment schedules.
        Admin approval/disbursement are separate financial events.
        """
        from apps.loans.services.loan_engine import LoanEngine
        from apps.ledger.models import LedgerEntry

        loan = approved_loan
        loan.status = 'pending_treasurer'
        loan.save(update_fields=['status'])

        result = LoanEngine.approve_loan(
            loan=loan,
            authorizing_member=treasurer,
            provided_pin='1234',
        )

        assert result.status == 'pending_admin'
        assert LedgerEntry.objects.filter(related_loan=result).count() == 0
        assert result.repayments.count() == 0

    def test_disburse_approved_loan_creates_ledger_and_repayments(
        self, approved_loan, chairperson
    ):
        from apps.loans.services.loan_engine import LoanEngine
        from apps.ledger.models import LedgerEntry, LedgerEventGroup
        from apps.ledger.services import append_ledger_entry

        approved_loan.status = 'approved'
        approved_loan.save(update_fields=['status'])

        # Disbursement is overdraft-protected: the loaning stream must hold
        # at least the principal before money can leave it.
        append_ledger_entry(
            group=approved_loan.group,
            account_stream='loaning',
            entry_type='contribution',
            direction='credit',
            amount=Decimal('15000.00'),
            currency='KES',
            description='Seed loan pool for disbursement test',
            reference='SEED-LOAN-POOL-001',
        )

        result = LoanEngine.disburse_loan(
            loan=approved_loan,
            actor=chairperson,
            disbursement_reference='MANUAL-DISB-001',  # manual/offline path — no provider call
        )

        assert result.status == 'disbursed'
        assert result.disbursed_at is not None
        assert result.disbursement_reference == 'MANUAL-DISB-001'

        # Balanced event group: principal out of the loan pool, matched by a
        # provider_settlement credit so bank reconciliation sees the outflow.
        entries = LedgerEntry.objects.filter(related_loan=result)
        assert entries.count() == 2
        loaning_entry = entries.get(account_stream='loaning')
        settlement_entry = entries.get(account_stream='provider_settlement')
        assert loaning_entry.direction == 'debit'
        assert settlement_entry.direction == 'credit'
        assert loaning_entry.amount == settlement_entry.amount == result.amount

        event_group = LedgerEventGroup.objects.get(
            event_group_key=f"loan_disbursement:{result.id}"
        )
        assert event_group.status == LedgerEventGroup.STATUS_CLOSED

        assert result.repayments.count() > 0

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

    def test_transaction_pin_locks_after_three_failed_attempts(self, loan_pending_chair, chairperson):
        from apps.loans.services.loan_engine import LoanEngine

        for _ in range(3):
            with pytest.raises(PermissionError, match="PIN verification failed|locked"):
                LoanEngine.approve_loan(
                    loan=loan_pending_chair,
                    authorizing_member=chairperson,
                    provided_pin='9999',
                )

        chairperson.refresh_from_db()
        assert chairperson.transaction_pin_failed_attempts == 3
        assert chairperson.transaction_pin_locked_at is not None

        with pytest.raises(PermissionError, match="locked"):
            LoanEngine.approve_loan(
                loan=loan_pending_chair,
                authorizing_member=chairperson,
                provided_pin='1234',
            )

        loan_pending_chair.refresh_from_db()
        assert loan_pending_chair.status == 'pending_chair'

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

    def test_country_policy_interest_cap_overrides_legacy_fallback(self, group, user, group_member):
        """
        Country policy caps should be controlled by platform policy, not a
        hardcoded universal rate. Kenya can therefore enforce a lower cap.
        """
        from apps.admin_portal.models import CountryPolicy
        from apps.loans.models import Loan
        from django.core.exceptions import ValidationError

        CountryPolicy.objects.create(
            country='kenya',
            currency='KES',
            central_bank_name='Central Bank of Kenya',
            max_loan_interest_rate_monthly=Decimal('8.00'),
            recommended_loan_interest_rate_monthly=Decimal('3.00'),
            is_active=True,
        )

        loan = Loan(
            group=group,
            borrower=user,
            amount=Decimal('10000.00'),
            currency='KES',
            interest_rate_monthly=Decimal('9.00'),
            term_weeks=12,
            purpose='Above Kenya policy cap',
        )

        with pytest.raises(ValidationError, match="Central Bank of Kenya"):
            loan.full_clean()

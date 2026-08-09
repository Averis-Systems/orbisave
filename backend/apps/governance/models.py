from django.db import models
from common.models import BaseModel


class GroupProposal(BaseModel):
    """A group decision put to a member vote.

    Lives on the country shard alongside the group. Loaning has ready-made
    proposal types that carry the proposed terms in `payload`; any other decision
    can be raised as a `custom` proposal. Outcome is decided by QUORUM: enough of
    the active members must vote (`quorum_pct`), and of the yes/no votes cast a
    majority (`pass_pct`) must be Yes.
    """
    TYPES = [
        ('activate_loan_pool', 'Activate the loan pool'),
        ('deactivate_loan_pool', 'Deactivate the loan pool'),
        ('change_loan_terms', 'Change loan terms'),
        ('change_contribution', 'Change contribution amount'),
        ('change_savings', 'Change mandatory savings'),
        ('remove_member', 'Remove a member'),
        ('dissolve_group', 'Dissolve the group'),
        ('custom', 'Custom decision'),
    ]
    STATUS = [
        ('open', 'Open'),
        ('passed', 'Passed'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired (no quorum)'),
        ('cancelled', 'Cancelled'),
    ]

    group = models.ForeignKey('groups.Group', on_delete=models.CASCADE, related_name='proposals')
    proposal_type = models.CharField(max_length=30, choices=TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    # Proposed settings applied verbatim on pass (e.g. loan terms, new amount,
    # or {"member_id": "..."} for a removal). Empty for a purely informational
    # custom decision.
    payload = models.JSONField(default=dict, blank=True)

    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True,
        related_name='proposals_created', db_constraint=False,
    )

    # Governance knobs (percent of active members / of votes cast).
    quorum_pct = models.DecimalField(max_digits=5, decimal_places=2, default=50)
    pass_pct = models.DecimalField(max_digits=5, decimal_places=2, default=50)

    status = models.CharField(max_length=15, choices=STATUS, default='open')
    closes_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)
    outcome_note = models.TextField(blank=True)

    class Meta:
        db_table = 'governance_proposal'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['group', 'status']),
        ]

    def __str__(self):
        return f"[{self.status}] {self.title} ({self.group_id})"


class GroupVote(BaseModel):
    """One member's vote on a proposal. One vote per member (updatable while open)."""
    CHOICES = [('yes', 'Yes'), ('no', 'No'), ('abstain', 'Abstain')]

    proposal = models.ForeignKey(GroupProposal, on_delete=models.CASCADE, related_name='votes')
    voter = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='group_votes', db_constraint=False,
    )
    choice = models.CharField(max_length=10, choices=CHOICES)

    class Meta:
        db_table = 'governance_vote'
        unique_together = [('proposal', 'voter')]
        indexes = [
            models.Index(fields=['proposal', 'choice']),
        ]

from django.utils import timezone
from rest_framework import serializers

from .models import GroupProposal, GroupVote
from .services import tally


# Which payload fields each proposal type accepts (validated on create so a
# proposal can only ever change what its type is allowed to).
PAYLOAD_FIELDS = {
    'activate_loan_pool': {'loan_pool_pct', 'loan_interest_rate_monthly', 'max_loan_multiplier', 'loan_term_weeks'},
    'change_loan_terms': {'loan_pool_pct', 'loan_interest_rate_monthly', 'max_loan_multiplier', 'loan_term_weeks'},
    'change_contribution': {'contribution_amount'},
    'change_savings': {'mandatory_savings_amount'},
    'remove_member': {'member_id'},
    'deactivate_loan_pool': set(),
    'dissolve_group': set(),
    'custom': set(),
}


class ProposalCreateSerializer(serializers.ModelSerializer):
    # Members pass a voting window in hours; the view turns it into closes_at.
    duration_hours = serializers.IntegerField(min_value=1, max_value=24 * 30, default=72, write_only=True)

    class Meta:
        model = GroupProposal
        fields = ['proposal_type', 'title', 'description', 'payload', 'quorum_pct', 'pass_pct', 'duration_hours']

    def validate(self, attrs):
        ptype = attrs['proposal_type']
        payload = attrs.get('payload') or {}
        allowed = PAYLOAD_FIELDS.get(ptype, set())
        extra = set(payload) - allowed
        if extra:
            raise serializers.ValidationError(
                {'payload': f"{ptype} does not accept: {', '.join(sorted(extra))}."}
            )
        for pct_field in ('quorum_pct', 'pass_pct'):
            v = attrs.get(pct_field)
            if v is not None and not (0 < v <= 100):
                raise serializers.ValidationError({pct_field: 'Must be between 0 and 100.'})
        return attrs


class VoteSerializer(serializers.Serializer):
    choice = serializers.ChoiceField(choices=[c[0] for c in GroupVote.CHOICES])


class ProposalSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    tally = serializers.SerializerMethodField()
    my_vote = serializers.SerializerMethodField()

    class Meta:
        model = GroupProposal
        fields = [
            'id', 'group', 'proposal_type', 'title', 'description', 'payload',
            'created_by', 'created_by_name', 'quorum_pct', 'pass_pct', 'status',
            'closes_at', 'resolved_at', 'outcome_note', 'created_at',
            'tally', 'my_vote',
        ]
        read_only_fields = fields

    def get_tally(self, obj):
        t = tally(obj)
        t['closed'] = obj.status != 'open' or timezone.now() >= obj.closes_at
        return t

    def get_my_vote(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return None
        vote = next((v for v in obj.votes.all() if v.voter_id == user.id), None)
        return vote.choice if vote else None

from datetime import timedelta

import structlog
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.groups.models import Group, GroupMember
from common.db_utils import get_db_for_country
from .models import GroupProposal
from .serializers import ProposalCreateSerializer, ProposalSerializer, VoteSerializer
from .services import cast_vote, resolve_if_ready

logger = structlog.get_logger(__name__)


def _member_or_404(request, group_pk, db_alias):
    """Resolve the group + assert the caller is an active member (else 404/403)."""
    group = get_object_or_404(Group.objects.using(db_alias), pk=group_pk)
    is_member = GroupMember.objects.using(db_alias).filter(
        group=group, member=request.user, status='active',
    ).exists()
    return group, is_member


class GroupProposalListCreateView(APIView):
    """GET list / POST create proposals for a group (active members only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, group_pk):
        db_alias = get_db_for_country(getattr(request.user, 'country', None))
        group, is_member = _member_or_404(request, group_pk, db_alias)
        if not is_member:
            return Response({'error': 'You are not an active member of this group.'}, status=403)
        proposals = (
            GroupProposal.objects.using(db_alias)
            .filter(group=group)
            .prefetch_related('votes')
        )
        # Lazily resolve any that hit their deadline since last read.
        for p in proposals:
            if p.status == 'open' and timezone.now() >= p.closes_at:
                resolve_if_ready(p, db_alias)
        data = ProposalSerializer(proposals, many=True, context={'request': request}).data
        return Response({'results': data, 'count': len(data)})

    def post(self, request, group_pk):
        db_alias = get_db_for_country(getattr(request.user, 'country', None))
        group, is_member = _member_or_404(request, group_pk, db_alias)
        if not is_member:
            return Response({'error': 'You are not an active member of this group.'}, status=403)
        if group.status != 'active':
            return Response({'error': 'Proposals can only be raised in an active group.'}, status=403)

        serializer = ProposalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data
        proposal = GroupProposal.objects.using(db_alias).create(
            group=group,
            proposal_type=v['proposal_type'],
            title=v['title'],
            description=v.get('description', ''),
            payload=v.get('payload') or {},
            quorum_pct=v.get('quorum_pct', 50),
            pass_pct=v.get('pass_pct', 50),
            created_by=request.user,
            closes_at=timezone.now() + timedelta(hours=v['duration_hours']),
        )
        logger.info('proposal_created', proposal_id=str(proposal.id), group_id=str(group.id), type=proposal.proposal_type)
        return Response(
            ProposalSerializer(proposal, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProposalDetailView(APIView):
    """GET a single proposal with its live tally (active members only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        db_alias = get_db_for_country(getattr(request.user, 'country', None))
        proposal = get_object_or_404(
            GroupProposal.objects.using(db_alias).prefetch_related('votes'), pk=pk,
        )
        is_member = GroupMember.objects.using(db_alias).filter(
            group=proposal.group, member=request.user, status='active',
        ).exists()
        if not is_member:
            return Response({'error': 'You are not an active member of this group.'}, status=403)
        if proposal.status == 'open' and timezone.now() >= proposal.closes_at:
            resolve_if_ready(proposal, db_alias)
        return Response(ProposalSerializer(proposal, context={'request': request}).data)


class ProposalVoteView(APIView):
    """POST a vote (yes/no/abstain) on an open proposal (active members only)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        db_alias = get_db_for_country(getattr(request.user, 'country', None))
        proposal = get_object_or_404(GroupProposal.objects.using(db_alias), pk=pk)
        is_member = GroupMember.objects.using(db_alias).filter(
            group=proposal.group, member=request.user, status='active',
        ).exists()
        if not is_member:
            return Response({'error': 'You are not an active member of this group.'}, status=403)

        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        proposal, vote = cast_vote(proposal, request.user, serializer.validated_data['choice'])
        if vote is None:
            return Response({'error': 'Voting on this proposal is closed.'}, status=409)
        return Response(ProposalSerializer(proposal, context={'request': request}).data)

from django.contrib import admin

from .models import GroupProposal, GroupVote


@admin.register(GroupProposal)
class GroupProposalAdmin(admin.ModelAdmin):
    list_display = ('title', 'proposal_type', 'status', 'closes_at', 'created_at')
    list_filter = ('status', 'proposal_type')
    search_fields = ('title', 'description')


@admin.register(GroupVote)
class GroupVoteAdmin(admin.ModelAdmin):
    list_display = ('proposal', 'voter', 'choice', 'created_at')
    list_filter = ('choice',)

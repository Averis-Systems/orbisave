from django.urls import path

from .views import GroupProposalListCreateView, ProposalDetailView, ProposalVoteView

urlpatterns = [
    path('groups/<uuid:group_pk>/proposals/', GroupProposalListCreateView.as_view(), name='group-proposals'),
    path('proposals/<uuid:pk>/', ProposalDetailView.as_view(), name='proposal-detail'),
    path('proposals/<uuid:pk>/vote/', ProposalVoteView.as_view(), name='proposal-vote'),
]

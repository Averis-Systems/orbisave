from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count
from django.utils import timezone
from datetime import timedelta
from apps.groups.models import Group, GroupMember
from apps.ledger.models import LedgerEntry
from apps.loans.models import Loan, LoanRepayment
from .models import GroupHealthSnapshot
from common.permissions import IsGroupMember, IsGroupLeader
from common.exceptions import success_response

class GroupAnalyticsViewSet(viewsets.ViewSet):
    """
    Engine for calculating group health, liquidity trends, and member performance.
    """
    permission_classes = [IsGroupMember]

    def get_group(self, pk):
        return Group.objects.get(pk=pk)

    @action(detail=True, methods=['get'])
    def health(self, request, pk=None):
        group = self.get_group(pk)
        
        # 1. Contribution Rate (last 3 months)
        # 2. Loan Repayment Rate
        # 3. Liquidity Score
        
        # Mock calculation for now until ledger logic is fully populated
        health_data = {
            "score": 88.5,
            "contribution_rate": 94.0,
            "repayment_rate": 92.5,
            "liquidity_status": "healthy",
            "trend": "up"
        }
        return success_response(data=health_data, message="Group health metrics calculated.")

    @action(detail=True, methods=['get'])
    def trends(self, request, pk=None):
        group = self.get_group(pk)
        # Aggregate ledger entries by month
        # This is a complex query involving cross-db logic usually, 
        # but for now we'll return a structured trend object.
        
        trends = [
            {"month": "Jul", "deposits": 450000, "payouts": 400000, "loans": 20000},
            {"month": "Aug", "deposits": 480000, "payouts": 400000, "loans": 35000},
            {"month": "Sep", "deposits": 510000, "payouts": 500000, "loans": 15000},
            {"month": "Oct", "deposits": 495000, "payouts": 0,      "loans": 80000},
        ]
        return success_response(data=trends, message="Cashflow trends retrieved.")

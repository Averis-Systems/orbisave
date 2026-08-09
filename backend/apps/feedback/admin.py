from django.contrib import admin

from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('subject', 'country', 'category', 'severity', 'status', 'created_at')
    list_filter = ('status', 'severity', 'category', 'country')
    search_fields = ('subject', 'message')
    readonly_fields = ('created_at', 'updated_at')

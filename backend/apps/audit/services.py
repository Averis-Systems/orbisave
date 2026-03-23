from apps.audit.models import AuditLog

def log_audit(action, actor, target_group=None, target_user=None, ip_address=None, user_agent=None, metadata=None, previous_state=None, new_state=None, country=None, session_id=None):
    """
    Creates an immutable audit log entry.
    """
    return AuditLog.objects.create(
        action=action,
        actor=actor,
        target_group=target_group,
        target_user=target_user,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata or {},
        previous_state=previous_state,
        new_state=new_state,
        country=country,
        session_id=session_id
    )

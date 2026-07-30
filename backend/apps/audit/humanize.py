"""
Turns an AuditLog row into a real sentence.

Every admin-facing activity feed used to render `log.action.replace('_', ' ')`
capitalised — which is how the dumping-ground code `admin_action` became the
meaningless "Admin Action" label repeated over and over, throwing away the
`target_group`, `target_user` and `metadata` the row actually carries (see
apps/audit/models.py and every log_audit() call site across the codebase).

This covers every action code actually written today, keyed off the same
`metadata` shape each call site already populates. Unmapped or future codes
fall through to a readable default instead of crashing — this must never
raise, an activity feed rendering a slightly worse line is fine, a 500 is not.

IMPORTANT — target_group is cross-database: AuditLog lives on 'default'
(apps.audit is a PLATFORM_APPS model) but the Group it points at lives on a
country shard (apps.groups is a FINANCIAL_APPS model, see
config/routers.py). `log.target_group` cannot be select_related() and a bare
lazy access re-queries on log's own DB ('default'), where no Group rows
exist — it raises Group.DoesNotExist instead of returning None. Callers MUST
resolve the group themselves (a single filtered query against the right
shard, batched across a page of rows) and pass it in as `target_group`.
"""


def _actor_name(log):
    return log.actor.full_name if log.actor_id and log.actor else 'System'


def _target_user_name(log):
    return log.target_user.full_name if log.target_user_id and log.target_user else 'a member'


def _target_group_name(target_group):
    return target_group.name if target_group else 'a group'


def _money(meta, target_group):
    """"{currency} {amount}" from metadata['amount'] + the target group's
    currency — loan audit calls never put currency in metadata itself."""
    amount = meta.get('amount')
    if amount is None:
        return None
    try:
        amount_fmt = f"{float(amount):,.0f}"
    except (TypeError, ValueError):
        amount_fmt = str(amount)
    currency = target_group.currency if target_group else ''
    return f"{currency} {amount_fmt}".strip()


def _fallback_label(log):
    display = dict(getattr(log, 'ACTION_TYPES', [])).get(log.action)
    return display or log.action.replace('_', ' ').capitalize()


def describe_audit(log, target_group=None) -> str:
    """
    `target_group` is the resolved apps.groups.models.Group instance (or
    None) for `log.target_group_id` — see the module docstring for why this
    cannot simply be `log.target_group`.
    """
    action = log.action
    meta = log.metadata or {}
    actor = _actor_name(log)
    target_user = _target_user_name(log)
    target_group_name = _target_group_name(target_group)

    if action == 'group_created':
        return f'{actor} created group "{target_group_name}"'
    if action == 'group_verified':
        return f'{actor} verified group "{target_group_name}"'
    if action == 'group_rejected':
        reason = meta.get('reason')
        return f'{actor} rejected group "{target_group_name}"' + (f' — {reason}' if reason else '')
    if action == 'group_paused':
        reason = meta.get('reason')
        return f'{actor} paused group "{target_group_name}"' + (f' — {reason}' if reason else '')
    if action == 'group_closed':
        return f'{actor} closed group "{target_group_name}"'
    if action == 'group_activated':
        return f'{actor} activated group "{target_group_name}"'

    if action == 'member_suspended':
        reason = meta.get('reason')
        return f'{actor} suspended {target_user} from "{target_group_name}"' + (f' — {reason}' if reason else '')
    if action == 'member_reinstated':
        return f'{actor} reinstated {target_user} in "{target_group_name}"'
    if action == 'member_exited':
        return f'{target_user} left "{target_group_name}"'
    if action == 'member_joined':
        return f'{target_user} joined "{target_group_name}"'

    if action in ('kyc_verified', 'kyc_approve', 'kyc_approved'):
        return f"{actor} approved {target_user}'s KYC"
    if action in ('kyc_rejected', 'kyc_reject'):
        reason = meta.get('reason')
        return f"{actor} rejected {target_user}'s KYC" + (f' — {reason}' if reason else '')
    if action == 'kyc_submitted':
        return f'{target_user} submitted a KYC document'

    if action in ('loan_approved', 'loan_chair_approved', 'loan_treasurer_approved'):
        return f'{actor} approved a loan request for {target_user}'
    if action in ('loan_rejected', 'loan_chair_rejected', 'loan_treasurer_rejected'):
        reason = meta.get('reason')
        return f'{actor} rejected a loan request for {target_user}' + (f' — {reason}' if reason else '')
    if action == 'loan_requested':
        return f'{target_user} requested a loan from "{target_group_name}"'
    if action == 'loan_admin_approved':
        money = _money(meta, target_group)
        return f'{actor} approved a {money} loan for {target_user}' if money else f'{actor} approved a loan for {target_user}'
    if action == 'loan_admin_rejected':
        reason = meta.get('reason')
        return f'{actor} rejected the loan for {target_user}' + (f' — {reason}' if reason else '')
    if action == 'loan_disbursed':
        money = _money(meta, target_group)
        return f'{actor} disbursed a {money} loan to {target_user}' if money else f'{actor} disbursed a loan to {target_user}'
    if action == 'loan_repayment_received':
        return f'{target_user} made a loan repayment on "{target_group_name}"'

    if action in ('contribution_confirmed',):
        return f'A contribution from {target_user} to "{target_group_name}" was confirmed'
    if action == 'contribution_failed':
        return f'A contribution from {target_user} to "{target_group_name}" failed'

    if action == 'invite_sent':
        channel = meta.get('channel')
        return f'{actor} sent {"a " + channel + " " if channel else "an "}invite for "{target_group_name}"'
    if action == 'invite_accepted':
        return f'An invite to "{target_group_name}" was accepted'

    if action == 'reconciliation_item_action':
        recon_action = str(meta.get('action', 'updated')).replace('_', ' ')
        issue_type = str(meta.get('issue_type', 'a reconciliation item')).replace('_', ' ')
        return f'{actor} marked {issue_type} as {recon_action}'

    if action == 'admin_action':
        # The dumping-ground code: the real verb lives in metadata, not `action`.
        verb = meta.get('action') or meta.get('admin_action')
        if verb == 'initialize_rotation':
            members = meta.get('members_count')
            suffix = f' ({members} members)' if members else ''
            return f'{actor} started the rotation for "{target_group_name}"{suffix}'
        if verb == 'next_cycle':
            cycle = meta.get('cycle_number')
            return f'{actor} advanced "{target_group_name}" to cycle {cycle}' if cycle else f'{actor} advanced "{target_group_name}" to the next cycle'
        if verb in ('suspend_user', 'suspend'):
            reason = meta.get('reason')
            return f'{actor} suspended {target_user}' + (f' — {reason}' if reason else '')
        if verb in ('reinstate_user', 'reinstate'):
            return f'{actor} reinstated {target_user}'
        if verb == 'kyc_reset':
            reason = meta.get('reason')
            return f"{actor} reset {target_user}'s KYC status" + (f' — {reason}' if reason else '')
        if verb:
            fields = meta.get('fields')
            suffix = f' ({", ".join(fields)})' if fields else ''
            return f'{actor} {str(verb).replace("_", " ")}{suffix}'
        return f'{actor} performed an administrative action'

    if action == 'user_login':
        return f'{actor} signed in'
    if action == 'user_logout':
        return f'{actor} signed out'
    if action == 'password_reset':
        return f'{actor} reset their password'
    if action == 'password_changed':
        return f'{actor} changed their password'
    if action == 'phone_verified':
        return f'{actor} verified their phone number'
    if action == 'transaction_pin_instantiated':
        return f'{actor} set up a transaction PIN'
    if action == 'transaction_pin_changed':
        return f'{actor} changed their transaction PIN'
    if action == '2fa_enabled':
        return f'{actor} enabled two-factor authentication'
    if action == '2fa_disabled':
        return f'{actor} disabled two-factor authentication'

    # Never seen in practice today, but declared — better than a raw code.
    return f'{actor} — {_fallback_label(log)}'

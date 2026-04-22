# OrbiSave — Backend Verification & Frontend Integration Advisory

---

## PART 1: BACKEND HEALTH CHECK

### ✅ What's Confirmed Clean

| Area | Status | Evidence |
|------|--------|----------|
| `django manage.py check` | ✅ 0 issues | Confirmed live |
| All `datetime.datetime.now()` calls | ✅ Eliminated | Grep returns 0 results |
| `transaction_pin_hash` duplicate | ✅ Deleted | Grep returns 0 in Python files |
| All cross-DB FKs (`db_constraint=False`) | ✅ Done | All 22 migrations confirmed |
| `RotationSchedule.unique_together` | ✅ Fixed | [('group','cycle_number','member')](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/accounts/kyc_views.py#86-96) |
| [GroupMember](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/models.py#54-85) states | ✅ Complete | `active/suspended/exited/deceased` |
| [PenaltyService](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/contributions/services/penalty_service.py#7-59) logic | ✅ Fixed | Checks `confirmed_at` vs `scheduled_date` |
| [LoanEngine](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services/loan_engine.py#12-120) admin stage | ✅ Added | Full 3-party chain |
| [loans/services.py](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services.py) collision | ✅ Resolved | File deleted; `services/` package active |
| [get_db_for_group()](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/db_utils.py#21-44) usage | ✅ Consistent | All `transaction.atomic(using=*)` calls updated |
| [RotationService](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/services/rotation_service.py#7-61) | ✅ Updated | Uses [get_db_for_group()](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/common/db_utils.py#21-44) + `timezone.now()` |
| Serializers present | ✅ Created | Contributions + Loans |
| KYC endpoints wired | ✅ Done | `POST/GET /api/v1/auth/kyc/` |
| Migration files | ✅ 22 files, no pending changes | `makemigrations --dry-run` → No changes |

---

### 🟡 What Is Still Missing (Deployment-time / Later Phase)

| Gap | Impact | Severity |
|-----|--------|----------|
| No unit tests | Can't verify engine correctness | 🔴 High |
| Webhook IP allowlisting | Any IP can call payment webhooks | 🟠 Medium |
| Real M-Pesa / MTN MoMo credentials | All payments use `MockProvider` | 🟠 Dev only |
| Celery beat tasks not wired | Scheduled enforcement (penalty scheduler, cycle checks) won't trigger | 🟠 Medium |
| Payout idempotency key | No guard against clicking "pay out" twice | 🟠 Medium |
| Interest rate upper cap | [LoanEngine](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/services/loan_engine.py#12-120) doesn't enforce a max % | 🟡 Low now |
| Transaction PIN not enforced on all sensitive actions | Only on loan approvals | 🟡 Low now |

---

## PART 2: FRONTEND–BACKEND INTEGRATION GUIDE

> Read this alongside [frontend_system_design_checklist](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/docs/frontend_system_design_checklist) Sections 4–13.

---

### 2.1 Auth — `POST /api/v1/auth/`

| Frontend Action | Endpoint | Notes |
|-----------------|----------|-------|
| Register | `POST /register/` | Body: `{email, phone, full_name, password}` → returns user object |
| Login | `POST /token/` | Body: `{email or phone, password}` → returns `{access_token}` (RS256 JWT, 15min) |
| Get current user | `GET /me/` | Bearer token required |
| Set transaction PIN | `POST /transaction-pin/` | Body: `{pin}` — Argon2id hashed server-side |

**Better Auth integration point:**
- The backend issues an RS256 JWT. Better Auth should treat this as an external JWT provider.
- Store the token in **httpOnly cookies** (the checklist demands this — Section 9 Auth Security).
- Do NOT store in localStorage.
- Refresh flow: Better Auth handles token refresh via `/token/` re-call on expiry.

---

### 2.2 KYC — `POST/GET /api/v1/auth/kyc/`

| Action | Endpoint | Notes |
|--------|----------|-------|
| Submit documents | `POST /kyc/submit/` | `multipart/form-data`: `document_type`, `front_image`, `back_image` (optional) |
| Check status | `GET /kyc/status/` | Returns `{kyc_status, documents[]}` |

**UX logic (frontend checklist Section 4):**
- **Chairperson:** Block group activation if `kyc_status !== 'verified'`. Show inline KYC prompt.
- **Treasurer:** Show KYC gate when role is first assigned.
- Poll `GET /kyc/status/` every 30s after submission, or use WebSocket `kyc.verified` event (when integrated).

---

### 2.3 Groups — `POST/GET /api/v1/groups/`

| Action | Endpoint | Notes |
|--------|----------|-------|
| Create group | `POST /groups/` | Body mirrors [Group](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/models.py#6-53) fields; chairperson = `request.user` |
| List my groups | `GET /groups/` | Returns groups where user is member |
| Group detail | `GET /groups/{id}/` | Includes `contribution_amount`, `currency`, `status`, `invite_code` |
| Assign rotation | `POST /groups/{id}/rotation/initialize/` | Triggers `RotationService.initialize_rotation()` |
| Start next cycle | `POST /groups/{id}/rotation/next-cycle/` | Admin-only |

**Onboarding wizard (frontend checklist Section 5):**  
The wizard maps 1:1 to [Group](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/groups/models.py#6-53) model fields:
1. Name, description, country
2. Contribution amount + frequency
3. Rotation method (sequential/random/manual)
4. Loan pool % (default: 30%)

**Require first deposit before activation:** The backend currently has no `first_deposit_required` gate — this needs to be enforced on the **frontend** until a backend guard is added. Disable "Activate Group" button until a contribution is confirmed.

---

### 2.4 Invites — `POST /api/v1/invites/`

| Action | Endpoint | Notes |
|--------|----------|-------|
| Send invite | `POST /invites/send/` | Body: `{contact, contact_type: 'email'|'phone'}` |
| Accept invite | `POST /invites/accept/{token}/` | Publicly accessible endpoint |
| List invites | `GET /invites/` | Shows pending invites for the group |

**Invite flow (checklist Section 5):**  
- Chairperson sees "Invite Members" only after KYC verified.
- Share an invite link: `https://app.orbisave.com/invite/{token}`.
- On accept: user is created/linked to group as `member` status.

---

### 2.5 Contributions — `POST/GET /api/v1/contributions/`

| Action | Endpoint | Notes |
|--------|----------|-------|
| Initiate contribution | `POST /contributions/{group_pk}/initiate/` | Body: `{amount, phone, method}` validated by [ContributionInitiateSerializer](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/contributions/serializers.py#10-48) |
| Webhook callback | `POST /contributions/webhook/{country}/{provider_id}/` | Provider-to-backend — NOT called from frontend |
| Member's contributions | via group detail or future list endpoint | |

**Frontend integration pattern:**
```typescript
// TanStack Query mutation
const contribute = useMutation({
  mutationFn: (data) => api.post(`/contributions/${groupId}/initiate/`, data),
  onSuccess: (res) => {
    // Poll for status OR listen for WebSocket 'contribution.confirmed' event
    startPolling(res.data.platform_reference)
  }
})
```

**Status polling:** After initiation, poll every 3s on the `platform_reference` until status is `confirmed` or `failed`. Show a live progress indicator.

**Validation (Zod schema to mirror backend):**
```typescript
z.object({
  amount: z.number().positive().min(1),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  method: z.enum(['mpesa', 'airtel', 'mtn_momo', 'bank'])
})
```

---

### 2.6 Loans — `POST/GET /api/v1/loans/`

| Action | Endpoint | Notes |
|--------|----------|-------|
| Request loan | `POST /loans/request/` | Body validated by [LoanRequestSerializer](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/serializers.py#9-40) |
| Approve loan | `POST /loans/{id}/approve/` | Body: `{pin}` — requires [LoanApprovalSerializer](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/serializers.py#46-60) |
| List loans | `GET /loans/` | Uses [LoanListSerializer](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/backend/apps/loans/serializers.py#96-107) |
| Loan detail | `GET /loans/{id}/` | Includes repayment schedule |

**Role-based access (checklist Section 6):**
- **Members:** Can only see their own loans.
- **Treasurer:** Can see all group loans + approve at `pending_treasurer` stage.
- **Chairperson:** Approves at `pending_chair` stage.

**Approval state badge logic:**
```typescript
const LOAN_STATUS_BADGE = {
  pending_chair:     { label: 'Awaiting Chair', color: 'yellow' },
  pending_treasurer: { label: 'Awaiting Treasurer', color: 'orange' },
  pending_admin:     { label: 'Awaiting Admin', color: 'red' },
  approved:          { label: 'Approved', color: 'green' },
  disbursed:         { label: 'Disbursed', color: 'blue' },
  defaulted:         { label: 'Defaulted', color: 'red' },
}
```

---

### 2.7 Payouts — `GET /api/v1/payouts/`

| Action | Endpoint | Notes |
|--------|----------|-------|
| Member's payout history | `GET /payouts/` | Filter by group |
| Execute payout (admin) | `POST /payouts/execute/` | Treasurer/Chair action |

Payout UI should show: current rotation position, who's next, date, amount (gross - fee = net).

---

### 2.8 Real-Time (WebSockets via Django Channels)

The backend has Django Channels + Redis configured. The frontend should connect to:

```
ws://api.orbisave.com/ws/group/{group_id}/
```

**Events to listen for:**

| Event | Payload | Frontend Action |
|-------|---------|-----------------|
| `contribution.confirmed` | `{platform_reference, amount, member_id}` | Update contribution tracker |
| `contribution.failed` | `{platform_reference, failure_reason}` | Show retry prompt |
| `payout.completed` | `{payout_id, net_amount, recipient_id}` | Update rotation timeline |
| `loan.status_changed` | `{loan_id, new_status}` | Update approval badge |
| `kyc.verified` | `{user_id}` | Unlock gated features |
| `member.joined` | `{member_id, group_id}` | Update member list |

> ⚠️ **WS consumers are NOT yet implemented on the backend.** This is the key socket work needed before the dashboard goes live. The infrastructure (Channels + Redis) exists — the consumers need to be written.

---

### 2.9 Dashboard Data Architecture

Use **TanStack Query** (checklist Section 13) with these query keys:

```typescript
['groups']                   // User's groups list
['group', groupId]           // Single group + membership
['contributions', groupId]   // Contribution history
['loans', groupId]           // Loan list
['rotation', groupId]        // Rotation schedule
['payout', groupId]          // Payout history
['kyc', 'status']            // KYC status
```

**Stale times:**
- Group data: 30s (changes infrequently)
- Contributions: 5s when a contribution is pending (aggressive polling)
- KYC status: 30s poll after submission
- Real-time data: invalidate via WebSocket events

---

### 2.10 Error Handling Contract

The backend uses a custom `orbisave_exception_handler`. All errors return:
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",   // e.g. "INSUFFICIENT_FUNDS"
  "detail": {}                        // Optional extra context
}
```

Map these to Zod/React Hook Form field errors or toast notifications. **Never show raw Django stacktraces.**

---

## PART 3: BACKEND READINESS SUMMARY

| Checklist | % Ready | Key Gap |
|-----------|---------|---------|
| [system_design_checklist](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/docs/system_design_checklist) | **78%** | Tests, CI/CD, load testing, monitoring alerts |
| [financial_engine_checklist](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/docs/financial_engine_checklist) | **72%** | Edge cases (partial contribution, exit mid-cycle, payout retry), WebSocket consumers |
| [frontend_system_design_checklist](file:///c:/Users/ADMIN/Desktop/Orbisave%20App/orbisave/docs/frontend_system_design_checklist) | **Backend part: 88%** | WebSocket consumers (the main socket gap), first-deposit gate |

### The 3 Things to Build Before Frontend Goes Live

1. **WebSocket consumers** (`apps/groups/consumers.py`) — emit all events listed in Section 2.8
2. **First-deposit gate** on group activation (either backend guard or frontend enforcement)
3. **Celery beat tasks** — wire the penalty scheduler and cycle-completion checker

> Once those 3 are done, the backend is production-ready for the MVP frontend.

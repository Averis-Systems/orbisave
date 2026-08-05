# OrbiSave — Security Review (living document)

Pre-production security posture for the OrbiSave fintech platform, assessed
against the fintech vulnerability categories we track, plus VPS/deployment
concerns. This is a **working register**: we remediate chunk by chunk as we
ready production. Add findings any time; mark items done with a date, never
delete, so the history stays auditable.

Scope reviewed: Django REST backend (per-country DB sharding on Postgres),
Next.js member app + Console + Manager, the `/api/backend` httpOnly-cookie
token proxy. Last reviewed: 2026-08-02.

Legend: ✅ Covered · 🟡 Partial · 🔴 Gap · 🔍 Needs audit · ⚪ N/A (no native
mobile app yet). This complements, and does not replace, `areas_of_concern.md`
(C1/H1–H4/M1–M8); items there are referenced, not duplicated.

---

## Executive summary

The **core is genuinely strong for this stage**: parameterised ORM only (no raw
SQL), no unsafe deserialisation, money is `Decimal` everywhere, an append-only
SHA-256 hash-chained ledger with a CI write-guard, Postgres advisory locks on
critical money operations, idempotent provider callbacks, RS256 JWTs the browser
never sees (httpOnly + SameSite cookies), and production security headers already
in place.

The work before go-live is mostly **hardening and operations**, not rewriting:
KYC upload validation, secret rotation + git-history purge, health/alerting,
CORS tightening, an object-authorization (IDOR) audit, admin MFA, and the VPS
layer (reverse proxy, TLS, firewall, backups, WAF/DDoS). None are blockers to a
"proper running system" today; they are the go-live checklist.

---

## 1. Financial & transactional

| Item | Status | Notes |
|------|--------|-------|
| Transaction tampering & replay | ✅ | Append-only ledger, SHA-256 hash chain (`previous_hash`+`hash`) + `sequence_number`; provider callbacks idempotent via `unique(provider, payload_checksum)` + `is_duplicate`. |
| Race conditions (double spend) | ✅ | `pg_advisory_xact_lock` around critical contribution/payout ops (`contributions/views.py`). **Postgres-only** — now that dev is Postgres too, this is actually exercised. |
| Integer overflow/underflow in ledger | ✅ | `DecimalField` (14,2) throughout; no integer money, no float. |
| Rounding errors (salami slicing) | 🟡 | Decimal avoids float drift; **verify a single rounding policy** (interest, fee split, payout remainder) is applied consistently and audited. |
| Invoice manipulation / fraudulent billing | 🔍 | Revenue = `service_fee` ledger rows. M2: the fee-booking path is unproven end to end; validate once. |
| Arbitrary deposit/withdrawal injection | ✅ | Writes go only through `append_ledger_entry` (CI "Ledger write guard"); no direct balance mutation. Confirm every money path routes through it. |
| Currency conversion exploitation | ⚪ | No cross-currency conversion; money never summed across currencies (per-country, per-currency). Revisit if FX is added. |
| Chargeback / dispute manipulation | 🔍 | Reconciliation queue exists; dispute/chargeback flow not yet a feature. |
| Cardholder data (PCI-DSS) | ⚪ | No card data stored; rails are bank + mobile money. Keep it that way (stay out of PCI scope). |
| Stored-value manipulation | ✅ | Balances are derived from the immutable ledger, not a mutable field. |

## 2. API & integration

| Item | Status | Notes |
|------|--------|-------|
| BOLA / IDOR (object-level authz) | 🔍 | **Priority audit.** Admin surfaces use `IsSuperAdmin` (global) or `IsPlatformAdmin` + country scoping (`resolve_admin_country`/`scope_filter`) — good. Member-facing endpoints must each enforce per-user/per-group ownership; sweep every `<uuid>` detail route to confirm it checks the caller owns/belongs, not just that they are authenticated. |
| Broken property-level authz | 🔍 | Serializers are explicit-field; confirm no mass-assignment of privileged fields (role, kyc_status, balances) from request bodies. |
| Broken function-level authz (BFLA) | ✅/🔍 | Permission classes per view (`IsSuperAdmin`, `IsPlatformAdmin`, `IsAuthenticated`). Audit that no state-changing admin action is only `IsAuthenticated`. |
| Unrestricted resource consumption | ✅ | DRF throttles (`burst`, `sustained`, `public`) + pre-DRF admin gate middleware. Add proxy-level `limit_req` at deploy. |
| Unrestricted access to sensitive flows | 🟡 | Public partner-enquiry endpoint is `AllowAny`+throttled (fine). Confirm loan/payout/role-change flows are role-gated and, where needed, PIN/step-up gated. |
| SSRF | 🔍 | Provider "test connection" and webhook registration hit external hosts; ensure target host/URL comes from admin-configured provider records only, never from an unauthenticated request body. |
| Third-party webhook misconfig | 🟡 | Callbacks store `payload_checksum`; **confirm inbound webhook signature verification** (`webhook_secret`) is enforced on every provider callback before trust. |
| API key / token leakage | ✅ | Provider secrets are Fernet-encrypted at rest and write-only in the API (read returns `has_*` booleans). Browser never receives JWTs. |
| Improper asset mgmt (shadow/zombie APIs) | 🟡 | Removed the orphaned `/payments/new` + `home2`. Keep a route inventory; retire stubs (M1). |
| Insecure dependencies (supply chain) | 🔴 | L3: dependency scanning is report-only. Add `pip-audit`/`npm audit` gates + Dependabot before go-live. |

## 3. Authentication & access control

| Item | Status | Notes |
|------|--------|-------|
| Broken auth / session mgmt | ✅ | RS256 JWT (asymmetric; prod refuses HS256), 15-min access / 7-day refresh, `ROTATE_REFRESH_TOKENS`. Tokens in httpOnly + SameSite=lax + secure cookies via the proxy; browser JS never sees them. |
| MFA bypass / SIM-swap | 🔴 | No MFA for Console/Manager admins (email+password only). **Add TOTP MFA for admin portals** before go-live; it is the single highest-leverage ATO defence for privileged accounts. |
| Credential stuffing / brute force | 🟡 | Auth throttling + admin gate; OTPs hashed with attempt caps. Add explicit per-account login lockout/backoff and breach-password checks for admins. |
| Insecure password reset | ✅ | `PhoneOTP`/`AdminEmailVerification` store **hashed** codes, scoped by purpose, with expiry + `attempt_count/max_attempts`. |
| Session fixation / hijacking | ✅ | Stateless JWT; refresh rotation; secure cookies. |
| Privilege escalation (V/H) | 🔍 | Roles: member/chair/treasurer/secretary/platform_admin/super_admin. Audit that role is server-assigned only and never settable from a request; confirm admin endpoints reject lower roles. |
| Hardcoded credentials | 🟡 | `seed_dev_accounts` (`OrbiSave2026!`) and compose (`dev_password`) are **dev-only**; ensure prod uses secret store and the seed command never runs in prod. Rotate the dev SECRET_KEY (C1). |
| Flawed SSO | ⚪ | No SSO integration. |
| Insufficient session timeout | ✅ | 15-min access token bounds the window; refresh rotates. |

## 4. Data security & cryptography

| Item | Status | Notes |
|------|--------|-------|
| Insecure storage of PII/financial | ✅/🟡 | Provider secrets Fernet-encrypted; ledger hash-chained. PII (name/phone/email/KYC docs) stored in Postgres — ensure disk/volume encryption on the VPS and least-privilege DB access. |
| Sensitive data in logs/errors | ✅ | Prod `DEBUG=False`; structured logging. Confirm no secret/PII fields in log payloads (spot-checked: logs use ids/emails, not passwords/tokens). |
| Weak/deprecated crypto | ✅ | RS256 (asymmetric), SHA-256 chain, Django PBKDF2 password hashing, Fernet (AES-128-CBC+HMAC). No MD5/SHA1 for security. |
| Insufficient TLS (MitM) | 🔴→deploy | App is TLS-ready (HSTS+preload, SSL redirect, secure cookies). **TLS itself is terminated at the reverse proxy** — must be configured on the VPS (see §9). |
| Poor key management | 🟡 | RS256 PEM keypair + `FIELD_ENCRYPTION_KEY` come from env/secret store. Document rotation; keep keys out of the repo (C1 history purge). |
| Unencrypted DB backups | 🔴 | No backup pipeline yet. Add automated **encrypted** Postgres backups + tested restore + PITR before go-live. |
| Data leakage via cache/screenshots | ⚪ | Web app; tokens are httpOnly (not in localStorage). Native-mobile concern only. |

## 5. Injection & input validation

| Item | Status | Notes |
|------|--------|-------|
| SQL injection | ✅ | ORM everywhere; the only `cursor.execute` is the advisory lock with a bound `%s` param. No string-built SQL, no `.raw()`/`.extra()` with interpolation. |
| NoSQL injection | ⚪ | No NoSQL store. |
| Command injection | ✅ | No `subprocess`/`os.system` on request data. |
| XSS | ✅/🟡 | React auto-escapes; only `privacy`/`terms` use `dangerouslySetInnerHTML` with **static** content (verify it never renders DB/user input). Hardening: add a Content-Security-Policy header at the proxy. |
| XXE | ⚪ | No XML parsing of untrusted input. |
| CSRF | ✅ | API auth is JWT (not session), so CSRF N/A for it; cookies are SameSite=lax; mutations use POST/PATCH/DELETE. Consider SameSite=strict for the auth cookie. |
| Insecure deserialization | ✅ | No `pickle`/`yaml.load`/`eval`/`marshal` on untrusted data. |
| Unvalidated redirects/forwards | 🔍 | `?next=` used on login redirect; confirm it only accepts same-origin/relative paths (open-redirect check). |
| File upload (RCE / stored XSS) | ✅ (2026-08-02) | `KYCSubmitView.validate_kyc_upload` now enforces a 10 MB cap, an extension + declared-content-type allowlist (jpg/png/pdf), and **byte sniffing** (Pillow `verify()` for images, `%PDF-` magic for PDFs) so an SVG/HTML script renamed to `.jpg` is rejected (tested). Remaining at deploy (§9): serve `media/` with `nosniff` + `Content-Disposition: attachment` from a cookie-less domain, and optionally re-encode images to strip polyglots/EXIF. Branding uses `ImageField` (Pillow-validated). |

## 6. Mobile & client-side

No native mobile app yet (web only), so most items are ⚪ N/A. Web equivalents:

| Item | Status | Notes |
|------|--------|-------|
| Reverse engineering / binary protections / root-jailbreak / SSL pinning / biometric | ⚪ | Revisit when/if a native app ships. |
| Insecure local storage | ✅ | Tokens in httpOnly cookies, not `localStorage`; browser JS cannot read them. |
| Clickjacking / UI redress | ✅ | `X_FRAME_OPTIONS = DENY` in prod. Add `frame-ancestors 'none'` via CSP too. |
| MitM (missing TLS) | 🔴→deploy | Enforced by HSTS + proxy TLS (see §4/§9). |

## 7. Infrastructure & operational (VPS)

| Item | Status | Notes |
|------|--------|-------|
| DDoS / app-layer DoS | 🔴→deploy | App throttles help; put a CDN/WAF (e.g. Cloudflare) in front + nginx `limit_req` + `fail2ban`. |
| Cloud/storage misconfig | 🟡 | Media on local disk or S3 (`USE_S3`); if S3, lock the bucket private + signed URLs; never public-read. |
| Unpatched OS/software | 🔴→deploy | Enable unattended security upgrades; pin + scan deps (§2). |
| Insufficient logging/monitoring | 🔴 | H1/H2: no `/healthz`+`/readyz`, no alerting. Add health endpoints, centralised logs, error tracking (Sentry), uptime + 5xx alerts. |
| DNS spoofing/poisoning | 🔍 | Use DNSSEC where the registrar supports it; rely on TLS for integrity. |
| Directory traversal | ✅ | No user-controlled filesystem paths; uploads use Django storage with generated paths. |
| Weak network segmentation | 🔴→deploy | Firewall (ufw): expose only 80/443. **Do not** publish Postgres/Redis to the internet (the dev Postgres is on `localhost:5433` only). Redis needs a password + localhost bind. |

## 8. Business logic & compliance

| Item | Status | Notes |
|------|--------|-------|
| KYC/AML bypass | 🟡 | Admin review is solid (Console global queue + Manager country queue, reason-tagged, approve/reject/suspend). **M8**: member-app enforcement (who is *prompted* for KYC) is not gated yet. |
| Promo/referral abuse | ⚪ | No promo/referral system yet. |
| Loan/credit-scoring manipulation | 🟡 | Loans use a chair→treasurer→admin approval chain + interest cap enforced against `CountryPolicy`. Confirm the cap can't be bypassed and rotation position can't be gamed (M7). |
| Account takeover (ATO) | 🟡 | Strong session model; the missing piece is admin MFA (§3) + login lockout. |
| Insider threat | 🟡 | Audit log (`AuditLog`) records admin actions; super_admin is powerful. Add least-privilege review + admin action alerting. |
| Regulatory (GDPR/CBK/POPIA) | 🔍 | Needs a data-protection pass: data retention, subject-access/erasure, consent, and CBK/central-bank requirements per country. Legal + engineering. |

---

## 9. VPS deployment hardening checklist

Not code yet — the go-live runbook. Track as its own chunk.

- **Reverse proxy (nginx)**: terminate TLS (Let's Encrypt, auto-renew), force HTTP→HTTPS, set HSTS/CSP/`X-Content-Type-Options`/`Referrer-Policy`, gzip, sane `client_max_body_size` (cap uploads), read/send timeouts, `limit_req` rate limiting.
- **App server**: run Django under **gunicorn/uvicorn** (never `runserver`) with `workers ≈ 2·cores+1`; systemd-managed; non-root user. `DJANGO_SETTINGS_MODULE=config.settings.production`.
- **Static/media**: serve via nginx/CDN. **User uploads (KYC) served with `X-Content-Type-Options: nosniff` + `Content-Disposition: attachment`**, ideally from a separate cookie-less domain, so a malicious upload can't run in the app origin.
- **Database**: Postgres not exposed publicly; strong per-service creds (rotate `dev_password`); volume/disk encryption; automated **encrypted** backups + tested restore + PITR; `pgbouncer` for connection pooling at scale.
- **Redis**: password-protected, bound to localhost/private network; used for cache + Celery broker.
- **Secrets**: from the host secret store / env, never the repo. **Rotate the dev `SECRET_KEY` and the Resend API key**; purge the old `.env` from git history (C1).
- **Firewall**: ufw allow only 80/443 (+ SSH from known IPs); SSH key-only, no root login, fail2ban.
- **Config guards**: ~~assert `DEBUG=False` in prod (M3)~~ **done** (`base.py` fail-safe default + `production.py` assert); ~~gate localhost CORS origins to dev only (H4)~~ **done** (localhost origins live only in `development.py`). Remaining: set `ALLOWED_HOSTS` to the real domains at deploy.
- **Scaling**: horizontal app scale behind the proxy/LB; Celery workers for background jobs; CDN for static; DB read replicas + pooling when traffic grows; cache hot reads in Redis.
- **Monitoring**: `/healthz`+`/readyz` (H1) for the LB; Sentry for errors; centralised logs; uptime + 5xx/latency + DB/redis alerts (H2).
- **Pre-launch**: third-party penetration test (L4); dependency scan gate (L3).

---

## 10. Suggested remediation order (chunk by chunk)

1. ~~**KYC upload validation** (§5)~~ — **Done 2026-08-02** (MIME+size+extension + byte sniffing). Media-serving hardening (nosniff/attachment/separate domain) remains at deploy.
2. **Secrets + config for prod** — ~~DEBUG guard (M3)~~ **Done 2026-08-06** (`base.py` defaults `DEBUG=False`, `production.py` asserts it); ~~CORS localhost gating (H4)~~ **Done 2026-08-06** (localhost origins moved to `development.py`; prod verified to carry none). Still open in this chunk: rotate SECRET_KEY + Resend key and purge git history (C1) — needs a deliberate procedure, not an auto-run; set `ALLOWED_HOSTS` to the real domains at deploy.
3. **Health + observability** — ~~`/healthz`+`/readyz` (H1)~~ **Done 2026-08-06** (`common/health.py`, unauthenticated/unthrottled, `/readyz` checks every shard, 503 on any failure). Still open: Sentry + alerting (H2).
4. **Admin MFA + login lockout** (§3) — TOTP for Console/Manager, per-account backoff.
5. **Object-authorization (IDOR) audit** (§2) — sweep every member-facing detail/mutation route for per-owner checks; verify no mass-assignment; verify webhook signature enforcement.
6. **VPS runbook** (§9) — nginx/TLS/firewall/backups/gunicorn; the deployment itself.
7. **Supply chain** — dependency scan gates + Dependabot (L3).
8. **Compliance pass** (§8) — data retention/erasure/consent, CBK/POPIA/GDPR.
9. **Pen test** before public launch (L4).

Nothing here blocks continued refinement or a working dev system today; it is the
runway to a safe production launch.

---

## Appendix A. Secret rotation + git-history purge runbook (C1)

**Do not run this automatically.** It is captured here to run deliberately when
readying production. Two of these steps are one-way: rotating `SECRET_KEY`
invalidates every signed value in flight (all active sessions, password-reset
and email-verification links), and a history rewrite force-pushes the shared
remote, so every collaborator must re-clone or hard-reset. Do them in a
maintenance window, with the team told in advance.

### A.1 What is exposed and why it matters

- The **development `SECRET_KEY`** was committed and pushed, so it lives in the
  public git history forever, even though the current tree reads it from the
  environment. In production `SECRET_KEY` signs sessions/CSRF and is the HS256
  fallback for JWTs, `production.py` already refuses to boot on that fallback,
  but the key must still never be the committed one.
- The **`RESEND_API_KEY`** and any real provider credentials must exist only in
  the server environment (`.env` is gitignored). Confirm none were ever
  committed (see A.4).

### A.2 Generate fresh production secrets (does not touch git)

```bash
# A new SECRET_KEY (50+ random chars):
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Fresh RS256 JWT keypair for production (never reuse the dev keys):
openssl genrsa -out jwt_private.pem 4096
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
```

Put these only in the production environment (systemd `EnvironmentFile`, or the
secret store), never in the repo:

```
SECRET_KEY=<new value>
JWT_PRIVATE_KEY_PATH=/etc/orbisave/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/etc/orbisave/jwt_public.pem
RESEND_API_KEY=<rotate a NEW key in the Resend dashboard, revoke the old one>
DATABASE_URL=...            # and the _KENYA/_RWANDA/_GHANA shards
CORS_ALLOWED_ORIGINS=       # only if a prod origin beyond console./manager. is needed
ALLOWED_HOSTS=...           # set to the real domains in production.py/env
```

Rotate the Resend key in the provider dashboard and **revoke** the old one, a
new value in the env is not enough while the old one still works.

### A.3 Purge the committed dev secret from git history

Use `git filter-repo` (preferred over the deprecated `filter-branch`/BFG). This
rewrites every commit, so coordinate first.

```bash
# 1. Fresh mirror clone, never rewrite your working repo in place.
git clone --mirror https://github.com/Averis-Systems/orbisave.git orbisave-purge
cd orbisave-purge

# 2. Replace the leaked literal everywhere it ever appeared. Put the exact
#    old key on the left; ==> the placeholder is what remains in history.
printf '<OLD_LEAKED_SECRET_KEY>==>REMOVED_SECRET\n' > ../replace.txt
git filter-repo --replace-text ../replace.txt

# 3. Force-push the rewritten history.
git push --force --all
git push --force --tags
```

Then, once, out of band: **every collaborator re-clones** (or
`git fetch && git reset --hard origin/main`). Old clones and any fork still
carry the secret, which is exactly why A.2's rotation is the real fix, the
purge reduces exposure but the key must be treated as burned regardless.

### A.4 Confirm no other secret was ever committed

```bash
# Spot-check history for the known-sensitive names:
git log -p --all -S 'RESEND_API_KEY' -- . | head
git log -p --all -S 'SECRET_KEY'      -- . | head
# Or run a scanner over the whole history before launch:
#   gitleaks detect --source . --log-opts="--all"
```

### A.5 Post-rotation verification

- Production boots (RS256 keys present, `DEBUG=False` assert passes).
- A fresh login issues a working JWT; an **old** token/session is rejected
  (expected, that is the rotation working).
- A verification/reset email sends via the new Resend key; the old key returns
  401 at Resend.
- `git log -p --all -S '<OLD_LEAKED_SECRET_KEY>'` returns nothing.

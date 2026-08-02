# OrbiSave Backend

The OrbiSave backend is a robust Django-based financial engine designed to handle secure community savings, loans, and payouts across multiple African regions.

## 🛠️ Technology Stack
- **Framework**: Django 5.0 + Django REST Framework (DRF)
- **Runtime**: Python 3.12
- **Database**: PostgreSQL 16 in Docker/production; **SQLite** for local dev (per-country shards)
- **Cache/Broker**: Redis 7
- **Task Queue**: Celery 5 (for background processing, interest calculation, and notifications)
- **Authentication**: Asymmetric RS256 JWT (coupled with Transaction PINs for high-risk operations)
- **API Docs**: DRF Spectacular (OpenAPI 3.0)

## 🏗️ Core Architecture

### Multi-Database Routing
To ensure regional data isolation and compliance, we use a custom database router:
- `default`: Stores platform-wide data (Accounts, Audit Logs, Notifications).
- `kenya`: Isolated financial data for Kenyan groups.
- `rwanda`: Isolated financial data for Rwandan groups.
- `ghana`: Isolated financial data for Ghanaian groups.

### Financial Engine
- **Immutable Ledger**: Append-only ledger system with SHA-256 hash chaining to prevent tampering.
- **Idempotent Webhooks**: Secure handling of payment provider callbacks (M-Pesa, MTN MoMo).
- **Advisory Locks**: `pg_advisory_xact_lock` used on critical financial operations to prevent race conditions.
- **RBAC**: Strict Role-Based Access Control (Chairperson, Treasurer, Member).

## 📂 Project Structure
- `apps/`: 13 domain-driven Django apps:
  - `accounts`: User profiles, KYC, and Auth.
  - `groups`: Chama/Group management and membership.
  - `ledger`: The core immutable double-entry ledger.
  - `contributions`: Savings initiation and tracking.
  - `loans`: Loan application, approval, and repayment.
  - `payouts`: Automated group payout engine.
  - `audit`: Platform-wide security audit trails.
- `config/`: Central settings and routing logic.
- `common/`: Shared middleware, base models, and permissions.

## 🚀 Getting Started

### Local development — Postgres (recommended)

Run dev against the **same engine as production (Postgres)**. SQLite is offered
as a no-setup fallback, but it does **not** exercise the financial-engine
concurrency (`pg_advisory_xact_lock` is a no-op on SQLite), so anything touching
money should be tested on Postgres.

0. **Database config**: copy `.env.example` to `.env`. It already points at the
   dockerised Postgres (host port **5433**). Start just the DB (you do **not**
   need the full Docker stack):
   ```bash
   docker compose -f infrastructure/docker/docker-compose.yml up -d db
   ```
   > Host port is **5433**, not 5432, so it never clashes with a native Postgres
   > install that may already own 5432. Creds: `orbisave` / `dev_password`, DBs
   > `orbisave`, `orbisave_ke`, `orbisave_rw`, `orbisave_gh`.
1. **Virtual environment** (first time only):
   ```bash
   python -m venv venv
   venv\Scripts\activate            # Windows  (macOS/Linux: source venv/bin/activate)
   pip install -r requirements/development.txt
   ```
2. **Migrate every database, seed the dev accounts, then run** (from `backend/`):
   ```bash
   # Windows (migrate + seed is exactly what .claude/launch.json runs)
   venv\Scripts\python.exe manage.py migrate_all
   venv\Scripts\python.exe manage.py seed_dev_accounts
   venv\Scripts\python.exe manage.py runserver 8000
   ```
   - `migrate_all` migrates the `default` DB **and** all three country shards.
     Plain `migrate` only touches `default`, which leaves the shards behind.
   - `seed_dev_accounts` is **idempotent** and (re)creates the login accounts
     below, so a fresh or wiped database never leaves you at "invalid
     credentials".

> Because local dev and the Docker backend now use the **same** Postgres, an
> account seeded once works no matter which backend answers on :8000. The only
> rule left: don't run two backends on :8000 at once (that's a port clash, not a
> data mismatch).

### Dev login accounts (created/reset by `seed_dev_accounts`)

All three are pre-verified (email + phone), so login works immediately, no OTP.

| Portal | URL | Email | Password |
|--------|-----|-------|----------|
| Console (super admin) | http://localhost:3002 | `emanuel@averissystems.com` | `OrbiSave2026!` |
| Manager (platform admin) | http://localhost:3003 | `manager@averissystems.com` | `OrbiSave2026!` |
| Member app | http://localhost:3000 | `member@orbisave.com` | `OrbiSave2026!` |

### Troubleshooting: "Invalid credentials" with a known-good password

This almost always means the backend answering on **:8000 is talking to a
database that has no accounts**. Two common causes:

1. **Fresh or wiped database.** Fix:
   ```bash
   venv\Scripts\python.exe manage.py seed_dev_accounts
   ```
2. **The Docker Postgres backend is shadowing port 8000** while you expect the
   local SQLite one (or vice versa). Only one process can own :8000. Check with
   `docker ps`; if `orbisave_backend` is up but you want the local SQLite server,
   run `docker stop orbisave_backend` first, then start the local backend.

Because the backend command in `.claude/launch.json` runs
`migrate_all && seed_dev_accounts && runserver`, starting the backend from any
IDE that uses that config always leaves you with working credentials.

### Background Tasks (optional, Docker/Postgres only)
```bash
# Start Worker
celery -A celery_app worker -l info

# Start Beat (Scheduler)
celery -A celery_app beat -l info
```

## 🔍 API Documentation
Once the server is running, visit:
- **Swagger UI**: `/api/v1/schema/swagger-ui/`
- **ReDoc**: `/api/v1/schema/redoc/`

# OrbiSave: Collective Capital Coordination

> **Financial Empowerment Through Social Saving.** OrbiSave is a digital financial coordination platform designed for community savings groups (**Chamas** and **ROSCAs**) in East and West Africa.

---

## 🏗️ Monorepo Architecture

OrbiSave is structured as a **Turborepo monorepo**, managing a modern Next.js frontend and a robust Django financial engine in a single, synchronized codebase.

- **Frontend**: Next.js 14/16 with GSAP animations and Tailwind CSS.
- **Admin Portals**: Dedicated portals for global oversight (**Console**) and regional management (**Manager**).
- **Backend**: Django 5.0 with a multi-database financial routing engine.
- **Packages**: Shared TypeScript types and utilities located in `frontend/packages/`.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js 20+** & **npm**
- **Python 3.12+**
- **Docker & Docker Compose**

### 2. Run with Docker (Recommended)
The easiest way to get the entire stack running (including Databases, Redis, Celery, and Flower):

```bash
# From the project root
docker-compose -f infrastructure/docker/docker-compose.yml up --build
```

- **Frontend (Web)**: [http://localhost:3001](http://localhost:3001)
- **Console (Super Admin)**: [http://localhost:3002](http://localhost:3002)
- **Manager (Regional Admin)**: [http://localhost:3003](http://localhost:3003)
- **Backend API**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **Flower (Tasks)**: [http://localhost:5555](http://localhost:5555)

---

## 🛠️ Manual Development Setup

If you prefer running services individually for faster hot-reloading:

> **One database everywhere.** Dev now runs on **Postgres**, the same engine as
> production, so behaviour matches and there is a single set of accounts. Just
> don't run two backends on port 8000 at once (a port clash, not a data one).

### 1. Backend (Django + Postgres)
```bash
# Start only the Postgres container (host port 5433; no need for the full stack)
docker compose -f infrastructure/docker/docker-compose.yml up -d db

cd backend
cp .env.example .env                # already points at localhost:5433 Postgres
python -m venv venv
.\venv\Scripts\activate             # Windows  (Unix: source venv/bin/activate)
pip install -r requirements/development.txt

python manage.py migrate_all        # default DB + kenya/rwanda/ghana shards
python manage.py seed_dev_accounts  # idempotent: guarantees the login accounts exist
python manage.py runserver 8000
```
*Backend runs at [http://localhost:8000](http://localhost:8000). `migrate_all` + `seed_dev_accounts` are what keep logins working, this is exactly what `.claude/launch.json` runs. SQLite is still available as a no-Docker fallback, see `backend/.env.example`.*

### 2. Frontends (Next.js) — run each in its own terminal
```bash
cd frontend      && npm install && npm run dev   # Member app / landing  -> http://localhost:3000
cd apps/console  && npm install && npm run dev   # Console (super admin) -> http://localhost:3002
cd apps/manager  && npm install && npm run dev   # Manager (platform)    -> http://localhost:3003
```

### 3. Dev login (seeded by `seed_dev_accounts`, password `OrbiSave2026!`)
| Portal | Email |
|--------|-------|
| Console | `emanuel@averissystems.com` |
| Manager | `manager@averissystems.com` |
| Member app | `member@orbisave.com` |

---

## 📂 Repository Structure

```text
orbisave/
├── apps/                      # Administrative Portals
│   ├── console/               # Global oversight (console.orbisave.com)
│   └── manager/               # Regional management (manager.orbisave.com)
├── frontend/                  # Member Web App & Shared Packages
│   ├── app/                   # Dashboard & Onboarding pages
│   └── packages/              # @orbisave/shared-types, @orbisave/shared-utils
├── backend/                   # Django 5 Project (13 focused apps)
│   ├── apps/                  # accounts, groups, ledger, loans, etc.
│   └── config/                # Database routers & Settings
└── infrastructure/
    └── docker/                # Dockerfiles & Orchestration config
```

---

## 🛡️ Core Financial Features
- **Immutable Ledger**: SHA-256 hash-chaining for all financial records.
- **Regional Isolation**: Physically separate databases for Kenya, Rwanda, and Ghana.
- **Asymmetric Security**: RS256 JWT Authentication and Transaction PINs.

---

## 📖 Detailed Documentation
- [Frontend Deep Dive](frontend/README.md)
- [Backend Engine Details](backend/README.md)
- [Infrastructure & Docker](infrastructure/docker/README.md)

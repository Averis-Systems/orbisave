# OrbiSave: Collective Capital Coordination

> **Financial Empowerment Through Social Saving.** OrbiSave is a digital financial coordination platform designed for community savings groups (**Chamas** and **ROSCAs**) in East and West Africa.

---

## 🏗️ Monorepo Architecture

OrbiSave is structured as a **Turborepo monorepo**, managing a modern Next.js frontend and a robust Django financial engine in a single, synchronized codebase.

- **Frontend**: Next.js 14/16 with GSAP animations and Tailwind CSS.
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

- **Frontend**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **Flower (Tasks)**: [http://localhost:5555](http://localhost:5555)

---

## 🛠️ Manual Development Setup

If you prefer running services individually for faster hot-reloading:

### 1. Backend (Django)
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Unix
source venv/bin/activate

pip install -r requirements/development.txt
python manage.py migrate
python manage.py runserver
```
*Backend runs at [http://localhost:8000](http://localhost:8000)*

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at [http://localhost:3000](http://localhost:3000)*

---

## 📂 Repository Structure

```text
orbisave/
├── frontend/                  # Next.js App Router & Shared Packages
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

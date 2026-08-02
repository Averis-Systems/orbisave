# OrbiSave Frontend: Premium Savings Dashboard

This is the Next.js workspace for the OrbiSave platform, built to provide a high-end, high-performance financial interface for community leaders and members.

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Vanilla CSS + Tailwind (Design System in `globals.css`)
- **Animations**: GSAP (GreenSock) for high-end UI transitions
- **State**: Zustand (Auth, UI, Financial State)
- **Forms**: React Hook Form + Zod

---

## 📦 Shared Monorepo Packages
Located in `packages/`, these ensure consistency across the frontend ecosystem:
- **`@orbisave/shared-types`**: Centralized TypeScript enums & interfaces synced with Django models.
- **`@orbisave/shared-utils`**: Shared financial logic (currency, dates, interest rates).
- **`@orbisave/ui`**: Shared design tokens and base components.

---

## 🚀 Getting Started

> **Start the backend first.** Every frontend talks to the API at
> `http://localhost:8000` through the same-origin `/api/backend` proxy. If the
> backend is not running (or is a different database than the one seeded), you
> will see "invalid credentials" on login. See
> [backend/README](../backend/README.md) for the exact start command; it seeds
> the dev accounts below on every start.

### 1. Local Development

Run each app from its own directory with `npm run dev`:

| App | Directory | Command | URL |
|-----|-----------|---------|-----|
| Member app / landing | `frontend/` | `npm install && npm run dev` | http://localhost:3000 |
| Console (super admin) | `apps/console/` | `npm install && npm run dev` | http://localhost:3002 |
| Manager (platform admin) | `apps/manager/` | `npm install && npm run dev` | http://localhost:3003 |

**Dev login** (seeded by the backend's `seed_dev_accounts`, password `OrbiSave2026!`):
Console `emanuel@averissystems.com` · Manager `manager@averissystems.com` · Member `member@orbisave.com`.

### 2. Full Stack (Docker)
To run the frontend alongside the backend and database:
Refer to the [Root README](../README.md) for Docker commands. The Dockerized frontend will be available at [http://localhost:3001](http://localhost:3001).

> Docker uses **PostgreSQL**; local `npm run dev` + local Django uses **SQLite**.
> These are separate databases with separate accounts. Do not mix the two on
> port 8000, or the account you seeded in one will be "missing" in the other.

---

## 🛡️ Administrative Portals

OrbiSave features two dedicated administrative environments, located in the `apps/` directory. Access is restricted to accounts with the `@averissystems.com` corporate domain.

### 1. Console (Global Oversight)
- **Directory**: `apps/console/`
- **Dev Command**: `npm run dev` (Port 3002)
- **Role**: `super_admin`
- **URL**: [http://localhost:3002](http://localhost:3002)

### 2. Manager (Regional Operations)
- **Directory**: `apps/manager/`
- **Dev Command**: `npm run dev` (Port 3003)
- **Role**: `platform_admin`
- **URL**: [http://localhost:3003](http://localhost:3003)

---

## 📂 Key Directories
- **`app/`**: Route handlers and page components.
  - `chama-onboarding/`: The 5-step leader registration flow.
  - `dashboard/`: Role-based financial views.
- **`components/`**: Feature-specific UI components (Auth, Groups, Ledger).
- **`store/`**: Zustand state management (e.g., `auth.ts`).

---

## 🎨 Design Principles
- **Visual Excellence**: Dark modes, glassmorphism, and custom brand colors (`#00ab00`).
- **Interactive**: Micro-animations on all buttons and state transitions.
- **Natural UX**: Custom accessible dropdowns and high-density data visualizations.

---

## 🛡️ Security
- **RS256 JWT**: Secure token handling with automatic rotation.
- **CSRF Protection**: Native Next.js protection for all mutations.
- **Client-Side PINs**: Optional biometric/PIN overlay for sensitive transactions.

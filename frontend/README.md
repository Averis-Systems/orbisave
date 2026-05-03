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

### 1. Local Development
For the best development experience with hot-reloading:
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

### 2. Full Stack (Docker)
To run the frontend alongside the backend and database:
Refer to the [Root README](../README.md) for Docker commands. The Dockerized frontend will be available at [http://localhost:3001](http://localhost:3001).

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

# OrbiSave Development Notes — May 2026

## 🛡️ Recent Architectural Stability Fixes
- **Cross-Database Integrity**: Resolved `IntegrityError` in the `audit_log` app by setting `db_constraint=False` on the `target_group` field. This allows global audit logs in the `default` database to reference groups in regional shards without physical foreign key violations.
- **Hydration & Auth Sync**: Refactored `DashboardLayout.tsx` to handle client-side hydration before auth checks. This prevents the "flash logout" bug where users were redirected to `/login` before their persisted session was fully rehydrated.
- **Hook Consistency**: Standardized hook call order in layout components to prevent `Rendered more hooks than during previous render` errors during 404 transitions.

## 🎨 Branding & Design System Constraints
- **Border Radius**: **STRICT 8px CAP**. All dashboard cards, containers, and primary UI elements must use `rounded-lg` (0.5rem / 8px). Do NOT use `rounded-xl`, `rounded-2xl`, or `rounded-3xl` for dashboard containers.
- **Loading States**: All asynchronous data fetching must use **Skeletal Loading** (`Skeleton` component from `@/components/ui/skeleton`) instead of spinners (`Loader2`).
- **Colors**:
  - Primary Green: `#00ab00`
  - Primary Navy: `#0a2540`
  - Font: Strictly **Jost**.

## 🚀 Completed Features
- **My Group Hub**: Dashboard view for active/pending group status.
- **Personal Info**: Role-aware profile page for managing KYC and credentials.
- **Custom 404s**: Both global and dashboard-internal 404 pages with Lottie animations.

## 🔜 Next Steps for Developers
1. **KYC Document Upload**: Implement the actual file upload logic for ID/Selfie in the profile page.
2. **Regional Database Seeds**: Ensure `orbisave_ke`, `orbisave_rw`, and `orbisave_gh` have consistent initial metadata for testing.
3. **Contribution History**: Expand the `ContributionTracker` to show real historical data from the `ledger` app.
4. **Member Invitations**: Finalize the invite link generation logic in the `My Group` page.

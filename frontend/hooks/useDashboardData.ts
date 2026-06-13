/**
 * useDashboardData.ts
 *
 * ⚠️  LEGACY SHIM — do not add new hooks here.
 *
 * All hooks have been migrated to their canonical files:
 *   - useGroups, useGroupDetail  →  @/hooks/useGroups
 *   - useContributions           →  @/hooks/useContributions
 *
 * This file exists only to preserve any legacy imports from older pages.
 * The old version of this file contained a hardcoded mock useGroups that
 * returned fake group IDs (e.g. "KAC-2025-001") which could never match
 * live DB UUIDs, and a broken useContributions hitting the wrong endpoint.
 * Both have been removed.
 */
export { useGroups, useGroupDetail } from '@/hooks/useGroups'
export { useContributions } from '@/hooks/useContributions'

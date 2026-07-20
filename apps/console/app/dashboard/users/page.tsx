'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Search, ShieldCheck, UserCheck, Users } from 'lucide-react'
import {
  PageHeader,
  SectionCard,
  DataTable,
  EmptyState,
  StatusBadge,
  Tabs,
  type Column,
} from '@/components/ui'
import { countryLabel, formatCount, formatDateTime } from '@/lib/format'

/**
 * Users.
 *
 * Two populations that were previously conflated under "Members & KYC" and
 * served by a placeholder:
 *
 *   Staff   - platform admins, one per country, who run Manager. These are
 *             Averis employees. Source: /admin-portal/platform-admins/.
 *   Members - people who use the member app: members, chairpersons,
 *             treasurers. Source: /admin-portal/users/.
 *
 * They are separated because the questions differ. For staff you ask "who has
 * access and is it still live". For members you ask "where are they in KYC".
 * Neither endpoint returns super admins, by deliberate backend policy.
 *
 * Filtering is server-side on both tabs: /admin-portal/users/ accepts role,
 * kyc_status and search, and /admin-portal/platform-admins/ accepts country.
 * Nothing here filters an already-fetched array in the browser.
 */

type Tab = 'staff' | 'members'

interface StaffRow {
  id: string
  email: string
  full_name: string
  phone: string
  country: string
  is_active: boolean
  email_verified: boolean
  last_login: string | null
  created_at: string
}

interface MemberRow {
  id: string
  email: string
  full_name: string
  phone: string
  country: string
  role: string
  kyc_status: string
  email_verified: boolean
  created_at: string
}

const COUNTRIES = ['kenya', 'rwanda', 'ghana']
const MEMBER_ROLES = ['member', 'chairperson', 'treasurer']
const KYC_STATUSES = ['pending', 'submitted', 'verified', 'rejected']

const SELECT_CLASS =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-primary focus:ring-4 focus:ring-primary/10'

/**
 * useSearchParams opts the route into client-side rendering and `next build`
 * fails the page outright unless it sits under a Suspense boundary. Dev does
 * not surface this, so the wrapper is deliberate rather than incidental.
 */
export default function ConsoleUsersPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />}>
      <UsersView />
    </Suspense>
  )
}

function UsersView() {
  const router = useRouter()
  const params = useSearchParams()

  // The tab and every filter live in the URL so a view can be linked to, and
  // so the overview's "KYC awaiting review" card can deep-link straight into
  // the filtered members list.
  const tab = (params.get('tab') as Tab) || 'staff'
  const country = params.get('country') || ''
  const role = params.get('role') || ''
  const kycStatus = params.get('kyc_status') || ''
  const search = params.get('search') || ''

  const [searchInput, setSearchInput] = useState(search)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [counts, setCounts] = useState<{ staff: number | null; members: number | null }>({
    staff: null,
    members: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setParam = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value)
        else next.delete(key)
      })
      router.replace(`/dashboard/users?${next.toString()}`)
    },
    [params, router],
  )

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const request =
      tab === 'staff'
        ? api.get('/admin-portal/platform-admins/', { params: { country: country || undefined } })
        : api.get('/admin-portal/users/', {
            params: {
              role: role || undefined,
              kyc_status: kycStatus || undefined,
              search: search || undefined,
            },
          })

    request
      .then(({ data }) => {
        if (cancelled) return
        const results = data?.results || []
        if (tab === 'staff') {
          setStaff(results)
          setCounts((c) => ({ ...c, staff: data?.count ?? results.length }))
        } else {
          setMembers(results)
          setCounts((c) => ({ ...c, members: data?.count ?? results.length }))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this list. Refresh to try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tab, country, role, kycStatus, search])

  const staffColumns: Column<StaffRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (r) => (
          <div>
            <p className="font-medium text-navy">{r.full_name || 'Unnamed'}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
        ),
      },
      { key: 'country', header: 'Country', render: (r) => countryLabel(r.country) },
      { key: 'phone', header: 'Phone', render: (r) => <span className="tabular-nums">{r.phone || '-'}</span> },
      {
        key: 'status',
        header: 'Access',
        render: (r) => <StatusBadge status={r.is_active ? 'active' : 'suspended'} />,
      },
      {
        key: 'last_login',
        header: 'Last signed in',
        render: (r) =>
          r.last_login ? (
            <span className="tabular-nums text-slate-500">{formatDateTime(r.last_login)}</span>
          ) : (
            <span className="text-slate-400">Never</span>
          ),
      },
      {
        key: 'created',
        header: 'Added',
        align: 'right',
        render: (r) => <span className="tabular-nums text-slate-500">{formatDateTime(r.created_at)}</span>,
      },
    ],
    [],
  )

  const memberColumns: Column<MemberRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (r) => (
          <div>
            <p className="font-medium text-navy">{r.full_name || 'Unnamed'}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
        ),
      },
      { key: 'role', header: 'Role', render: (r) => <span className="capitalize">{r.role?.replace(/_/g, ' ')}</span> },
      { key: 'country', header: 'Country', render: (r) => countryLabel(r.country) },
      { key: 'kyc', header: 'KYC', render: (r) => <StatusBadge status={r.kyc_status || 'pending'} /> },
      {
        key: 'email_verified',
        header: 'Email',
        render: (r) => <StatusBadge status={r.email_verified ? 'verified' : 'pending'} />,
      },
      {
        key: 'created',
        header: 'Joined',
        align: 'right',
        render: (r) => <span className="tabular-nums text-slate-500">{formatDateTime(r.created_at)}</span>,
      },
    ],
    [],
  )

  const isStaff = tab === 'staff'

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Users"
        description="Averis staff who operate the platform, and the members who use it. Listed separately because they are governed differently."
      />

      <Tabs
        items={[
          { id: 'staff', label: 'Staff', count: counts.staff },
          { id: 'members', label: 'Members', count: counts.members },
        ]}
        active={tab}
        onChange={(id) => setParam({ tab: id, role: '', kyc_status: '', search: '', country: '' })}
      />

      {error && (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-5 py-4 text-sm text-[#d92d20]">{error}</div>
      )}

      {isStaff ? (
        <SectionCard
          title="Platform admins"
          description="Each country is run by platform admins working in Manager. Super admins are not listed here."
          bodyClassName=""
          actions={
            <select
              aria-label="Filter staff by country"
              value={country}
              onChange={(e) => setParam({ country: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">All countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {countryLabel(c)}
                </option>
              ))}
            </select>
          }
        >
          {!loading && staff.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                icon={ShieldCheck}
                title="No platform admins yet"
                description={
                  country
                    ? `No platform admin is assigned to ${countryLabel(country)}. Invite one from the Platform Admins page.`
                    : 'Nobody has been given Manager access yet. Invite a platform admin to start country operations.'
                }
              />
            </div>
          ) : (
            <DataTable
              columns={staffColumns}
              rows={staff}
              rowKey={(r) => r.id}
              minWidth={880}
              empty={loading ? 'Loading staff…' : 'No staff match this filter.'}
            />
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title="Members"
          description="People using the member app. Filter by role or KYC state to work a queue."
          bodyClassName=""
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setParam({ search: searchInput.trim() })
                }}
                className="relative"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name or email"
                  aria-label="Search members"
                  className="h-10 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </form>
              <select
                aria-label="Filter members by role"
                value={role}
                onChange={(e) => setParam({ role: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">All roles</option>
                {MEMBER_ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter members by KYC status"
                value={kycStatus}
                onChange={(e) => setParam({ kyc_status: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">All KYC states</option>
                {KYC_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {!loading && members.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                icon={Users}
                title="No members match"
                description={
                  role || kycStatus || search
                    ? 'Clear the filters to see the full list.'
                    : 'Nobody has signed up yet. Members appear here as soon as they register.'
                }
              />
            </div>
          ) : (
            <DataTable
              columns={memberColumns}
              rows={members}
              rowKey={(r) => r.id}
              minWidth={880}
              empty={loading ? 'Loading members…' : 'No members match this filter.'}
            />
          )}
        </SectionCard>
      )}

      {/* The members endpoint currently returns at most 200 rows with no
          pagination. Saying so beats a table that silently stops. Removed once
          the shared server-driven table lands. */}
      {!isStaff && counts.members != null && counts.members > 200 && (
        <p className="text-xs text-slate-500">
          Showing the 200 most recent of {formatCount(counts.members)} members. Narrow the filters to reach older records.
        </p>
      )}
    </div>
  )
}

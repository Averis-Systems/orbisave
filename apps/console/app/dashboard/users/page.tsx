'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { Ban, CheckCircle2, Copy, ShieldCheck, UserRound, Users } from 'lucide-react'
import {
  PageHeader,
  RowMenu,
  ServerDataTable,
  StatusBadge,
  Tabs,
  useServerTable,
  countryLabel,
  formatDateTime,
  type RowAction,
  type ServerColumn,
  type TableFetcher,
  type TableFilter,
  type TablePage,
} from '@/components/ui'
import { UserDetailDrawer } from '@/components/UserDetailDrawer'

/**
 * Users.
 *
 * Two populations that were previously conflated under "Members & KYC":
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
 * Both tabs run on the shared ServerDataTable, so search, filters, sorting and
 * paging are all server-side and all mirrored into the URL. The previous
 * version fetched up to 200 rows and printed a warning that older records were
 * unreachable; that caveat is gone because the table can now reach them.
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
  group_id: string | null
  group_name: string | null
  group_role: string | null
}

const COUNTRY_OPTIONS = [
  { value: 'kenya', label: 'Kenya' },
  { value: 'rwanda', label: 'Rwanda' },
  { value: 'ghana', label: 'Ghana' },
]

// Sentinel for the "not in any group" filter option; matches the backend's
// ?group=__none__ handling.
const NO_GROUP = '__none__'

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'treasurer', label: 'Treasurer' },
]

const KYC_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
]

function NameCell({ name, email }: { name: string; email: string }) {
  return (
    <div>
      <p className="font-medium text-navy">{name || 'Unnamed'}</p>
      <p className="text-xs text-slate-400">{email}</p>
    </div>
  )
}

export default function ConsoleUsersPage() {
  // The tab lives in the URL so the overview's "KYC awaiting review" card can
  // deep-link straight into the members list. It is resolved AFTER mount
  // rather than in the initial state: the server has no URL to read, so a
  // lazy initialiser would render 'staff' on the server and 'members' on the
  // client for a deep-link, which is a hydration mismatch. Defaulting to
  // 'staff' on both and correcting in an effect keeps first render identical.
  const [tab, setTab] = useState<Tab>('staff')
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get('tab')
    if (urlTab === 'members') setTab('members')
    setResolved(true)
  }, [])

  const selectTab = (next: Tab) => {
    setTab(next)
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    // Switching tab abandons the other tab's filters, which do not apply.
    for (const key of ['tab', 'page', 'page_size', 'search', 'sort', 'role', 'kyc_status', 'country']) {
      params.delete(key)
    }
    if (next === 'members') params.set('tab', 'members')
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname)
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <PageHeader
        title="Users"
        description="Averis staff who operate the platform, and the members who use it. Listed separately because they are governed differently."
      />

      <Tabs
        items={[
          { id: 'staff', label: 'Staff' },
          { id: 'members', label: 'Members' },
        ]}
        active={tab}
        onChange={(id) => selectTab(id as Tab)}
      />

      {/* Rendered only once the tab is resolved from the URL, so a deep-link
          to members does not first mount the staff table and fire its fetch.
          Keyed so switching tabs mounts a fresh table: the two tabs have
          different filters and a different endpoint, and carrying one tab's
          query into the other would send a role filter to the staff list. */}
      {!resolved ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 motion-reduce:animate-none" />
      ) : tab === 'staff' ? (
        <StaffTable key="staff" />
      ) : (
        <MembersTable key="members" />
      )}
    </div>
  )
}

function StaffTable() {
  const fetcher = useCallback<TableFetcher<StaffRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/platform-admins/', { params, signal })
    return data as TablePage<StaffRow>
  }, [])

  const table = useServerTable<StaffRow>(fetcher, { filterKeys: ['country'] })

  const columns: ServerColumn<StaffRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortField: 'full_name',
        render: (r) => <NameCell name={r.full_name} email={r.email} />,
      },
      { key: 'country', header: 'Country', sortField: 'country', render: (r) => countryLabel(r.country) },
      {
        key: 'phone',
        header: 'Phone',
        render: (r) => <span className="tabular-nums">{r.phone || 'Not provided'}</span>,
      },
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
        sortField: 'created_at',
        render: (r) => <span className="tabular-nums text-slate-500">{formatDateTime(r.created_at)}</span>,
      },
    ],
    [],
  )

  return (
    <ServerDataTable
      table={table}
      columns={columns}
      rowKey={(r) => r.id}
      minWidth={920}
      searchPlaceholder="Search staff"
      filters={[{ key: 'country', label: 'Country', options: COUNTRY_OPTIONS }]}
      emptyIcon={ShieldCheck}
      emptyTitle="No platform admins yet"
      emptyDescription="Nobody has been given Manager access yet. Invite a platform admin to start country operations."
    />
  )
}

interface GroupOption {
  id: string
  name: string
  country: string
}

function MembersTable() {
  const fetcher = useCallback<TableFetcher<MemberRow>>(async (params, signal) => {
    const { data } = await api.get('/admin-portal/users/', { params, signal })
    return data as TablePage<MemberRow>
  }, [])

  const table = useServerTable<MemberRow>(fetcher, {
    filterKeys: ['role', 'kyc_status', 'country', 'group'],
  })

  // The member management drawer, opened from a row's action menu. Held here
  // so a suspend/reactivate inside it can refresh the table underneath.
  const [managing, setManaging] = useState<MemberRow | null>(null)

  // Group filter options come from the live groups list, so the dropdown only
  // ever offers groups that exist. Fetched once; the set changes slowly.
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([])
  useEffect(() => {
    const controller = new AbortController()
    api
      .get('/admin-portal/groups/', { params: { page_size: 100 }, signal: controller.signal })
      .then(({ data }) => setGroupOptions(data.results || []))
      .catch(() => {
        // A failed group fetch just leaves the group filter with its base
        // options; the rest of the table is unaffected.
      })
    return () => controller.abort()
  }, [])

  const filters: TableFilter[] = useMemo(
    () => [
      { key: 'country', label: 'Country', options: COUNTRY_OPTIONS },
      { key: 'role', label: 'Role', options: ROLE_OPTIONS },
      { key: 'kyc_status', label: 'KYC', options: KYC_OPTIONS },
      {
        key: 'group',
        label: 'Group',
        options: [
          { value: NO_GROUP, label: 'Not in a group' },
          ...groupOptions.map((g) => ({
            value: g.id,
            label: `${g.name} · ${countryLabel(g.country)}`,
          })),
        ],
      },
    ],
    [groupOptions],
  )

  const rowActions = useCallback(
    (member: MemberRow): RowAction[] => [
      {
        label: 'View & manage',
        icon: UserRound,
        onSelect: () => setManaging(member),
      },
      {
        label: 'Copy email',
        icon: Copy,
        onSelect: () => {
          navigator.clipboard?.writeText(member.email).catch(() => {})
        },
      },
    ],
    [],
  )

  const columns: ServerColumn<MemberRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortField: 'full_name',
        render: (r) => <NameCell name={r.full_name} email={r.email} />,
      },
      {
        key: 'group',
        header: 'Group',
        render: (r) =>
          r.group_name ? (
            <div>
              <p className="text-slate-700">{r.group_name}</p>
              {r.group_role && r.group_role !== 'member' && (
                <p className="text-xs capitalize text-slate-400">{r.group_role.replace(/_/g, ' ')}</p>
              )}
            </div>
          ) : (
            <span className="text-slate-300">No group</span>
          ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (r) => <span className="capitalize">{r.role?.replace(/_/g, ' ')}</span>,
      },
      { key: 'country', header: 'Country', sortField: 'country', render: (r) => countryLabel(r.country) },
      {
        key: 'kyc',
        header: 'KYC',
        sortField: 'kyc_status',
        render: (r) => <StatusBadge status={r.kyc_status || 'pending'} />,
      },
      {
        key: 'email_verified',
        header: 'Email',
        render: (r) => <StatusBadge status={r.email_verified ? 'verified' : 'pending'} />,
      },
      {
        key: 'created',
        header: 'Joined',
        sortField: 'created_at',
        render: (r) => <span className="tabular-nums text-slate-500">{formatDateTime(r.created_at)}</span>,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (r) => <RowMenu label={`Actions for ${r.full_name}`} actions={rowActions(r)} />,
      },
    ],
    [rowActions],
  )

  return (
    <>
      <ServerDataTable
        table={table}
        columns={columns}
        rowKey={(r) => r.id}
        minWidth={1100}
        searchPlaceholder="Search name or email"
        filters={filters}
        emptyIcon={Users}
        emptyTitle="No members yet"
        emptyDescription="Nobody has signed up yet. Members appear here as soon as they register."
      />

      {managing && (
        <UserDetailDrawer
          userId={managing.id}
          summaryName={managing.full_name}
          onClose={() => setManaging(null)}
          onChanged={() => table.refresh()}
        />
      )}
    </>
  )
}

'use client'

/**
 * The server-driven table both admin portals standardise on.
 *
 * One component owns the whole list experience: toolbar (search + declared
 * filters), sortable sticky header, row rendering, loading skeleton, error
 * with retry, honest empty state, and a pagination footer showing the true
 * total. Pages supply columns, filters and a fetcher; they do not hand-roll
 * list chrome. That is what makes the "every control does what it appears to
 * do" rule structural rather than per-page discipline: an inert search box or
 * dead kebab cannot be built with this component.
 *
 * Data always comes paginated from the server (never fetch-all-then-filter),
 * matching the backend envelope { count, page, page_size, total_pages,
 * results }.
 */

import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ServerTableState } from './useServerTable'
import { EmptyState } from './primitives'

export type ServerColumn<Row> = {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  /** Backend ordering field, e.g. 'created_at'. Omit for unsortable columns. */
  sortField?: string
  render: (row: Row) => ReactNode
}

export type TableFilterOption = { value: string; label: string }

export type TableFilter = {
  key: string
  label: string
  options: TableFilterOption[]
}

const alignClass = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

export function ServerDataTable<Row>({
  table,
  columns,
  rowKey,
  filters = [],
  searchPlaceholder = 'Search',
  emptyIcon,
  emptyTitle = 'No records found',
  emptyDescription,
  minWidth = 760,
  toolbarExtra,
}: {
  table: ServerTableState<Row>
  columns: ServerColumn<Row>[]
  rowKey: (row: Row, index: number) => string
  filters?: TableFilter[]
  searchPlaceholder?: string
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  minWidth?: number
  /** Page-specific toolbar content (e.g. an export button), right-aligned. */
  toolbarExtra?: ReactNode
}) {
  const { query, rows, count, totalPages, loading, error } = table

  const sortState = (field?: string): 'asc' | 'desc' | null => {
    if (!field || !query.sort) return null
    if (query.sort === field) return 'asc'
    if (query.sort === `-${field}`) return 'desc'
    return null
  }

  const toggleSort = (field?: string) => {
    if (!field) return
    const current = sortState(field)
    // asc -> desc -> off, the cycle admins expect from spreadsheet tools.
    table.setSort(current === 'asc' ? `-${field}` : current === 'desc' ? '' : field)
  }

  const from = count === 0 ? 0 : (query.page - 1) * query.page_size + 1
  const to = Math.min(query.page * query.page_size, count)

  const hasActiveCriteria = Boolean(query.search) || Object.keys(query.filters).length > 0

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            defaultValue={query.search}
            onChange={(e) => table.setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {filters.map((filter) => (
            <label key={filter.key} className="flex items-center gap-1.5">
              <span className="sr-only">{filter.label}</span>
              <select
                value={query.filters[filter.key] || ''}
                onChange={(e) => table.setFilter(filter.key, e.target.value)}
                aria-label={filter.label}
                className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                <option value="">{filter.label}: all</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {toolbarExtra}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white">
            <tr>
              {columns.map((col) => {
                const state = sortState(col.sortField)
                return (
                  <th
                    key={col.key}
                    aria-sort={state === 'asc' ? 'ascending' : state === 'desc' ? 'descending' : undefined}
                    className={`px-4 py-3 text-xs font-medium text-slate-500 first:pl-6 last:pr-6 ${alignClass(col.align)}`}
                  >
                    {col.sortField ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.sortField)}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          state ? 'text-navy' : ''
                        }`}
                      >
                        {col.header}
                        {state === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : state === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows columns={columns.length} rows={Math.min(query.page_size, 8)} />
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm font-medium text-navy">{error}</p>
                    <button
                      type="button"
                      onClick={table.refresh}
                      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10">
                  <EmptyState
                    icon={emptyIcon}
                    title={hasActiveCriteria ? 'Nothing matches these filters' : emptyTitle}
                    description={
                      hasActiveCriteria
                        ? 'Adjust or clear the search and filters to see more.'
                        : emptyDescription
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={rowKey(row, index)} className="transition-colors hover:bg-slate-50/70">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 text-sm text-slate-600 first:pl-6 last:pr-6 ${alignClass(col.align)}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer: always rendered so the layout never jumps. */}
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-slate-500 tabular-nums" aria-live="polite">
          {loading ? 'Loading…' : count === 0 ? 'No records' : `Showing ${from}–${to} of ${count}`}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Rows
            <select
              value={query.page_size}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
              className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <PagerButton
              label="Previous page"
              disabled={loading || query.page <= 1}
              onClick={() => table.setPage(query.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </PagerButton>
            <span className="min-w-[80px] text-center text-xs font-medium text-slate-600 tabular-nums">
              Page {query.page} of {Math.max(totalPages, 1)}
            </span>
            <PagerButton
              label="Next page"
              disabled={loading || query.page >= totalPages}
              onClick={() => table.setPage(query.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </PagerButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function PagerButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function SkeletonRows({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-4 py-3.5 first:pl-6 last:pr-6">
              <div
                className="h-4 animate-pulse rounded bg-slate-100 motion-reduce:animate-none"
                style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

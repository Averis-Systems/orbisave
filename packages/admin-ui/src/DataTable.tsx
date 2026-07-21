'use client'

/**
 * Static table for small, already-loaded datasets (a detail view's recent
 * activity, a five-row breakdown). Anything backed by a paginated list
 * endpoint uses ServerDataTable instead.
 */

import type { ReactNode } from 'react'

export type Column<T> = {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 720,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  minWidth?: number
  empty?: ReactNode
}) {
  const align = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    // Wide tables scroll horizontally rather than forcing the page to.
    <div className="max-w-full overflow-x-auto">
      <table className="w-full" style={{ minWidth }}>
        <thead className="border-y border-slate-100">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 text-xs font-medium text-slate-500 first:pl-6 last:pr-6 ${align(c.align)}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="transition-colors hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-4 text-sm text-slate-600 first:pl-6 last:pr-6 ${align(c.align)}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">
                {empty || 'No records yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

'use client'

/**
 * Server-driven table state, bound to the URL.
 *
 * Every list view in the admin portals used to fetch the entire collection and
 * filter it in the browser, which is exactly the fetch-all pattern the backend
 * pagination work closed off. This hook owns the other half of the contract:
 * page, page_size, search, sort and any page-specific filters live in the URL
 * query string, so views are shareable and back-navigable, and every change
 * triggers a server fetch with those parameters.
 *
 * The URL sync deliberately uses history.replaceState + popstate rather than
 * next/navigation's useSearchParams: the latter forces a Suspense boundary
 * around every page at build time, and a router.replace per keystroke would
 * re-render the whole route. Filter state is ephemeral view state; the URL is
 * a mirror of it, not the owner.
 *
 * The fetcher is injected so this package never owns an HTTP client or a
 * base URL: each app passes its own authenticated axios wrapper.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type TableQuery = {
  page: number
  page_size: number
  search: string
  /** Backend envelope's ordering param, e.g. '-created_at'. Empty = default. */
  sort: string
  /** Page-specific filters, e.g. { status: 'active', country: 'kenya' }. */
  filters: Record<string, string>
}

export type TablePage<Row> = {
  results: Row[]
  count: number
  page: number
  page_size: number
  total_pages: number
}

export type TableFetcher<Row> = (
  params: Record<string, string | number>,
  signal: AbortSignal,
) => Promise<TablePage<Row>>

const DEFAULTS = { page: 1, page_size: 50, search: '', sort: '' }

function readQueryFromUrl(filterKeys: string[]): TableQuery {
  // During server render there is no URL to read; the defaults render, and the
  // first client effect refetches with the real query if it differs.
  if (typeof window === 'undefined') {
    return { ...DEFAULTS, filters: {} }
  }
  const params = new URLSearchParams(window.location.search)
  const filters: Record<string, string> = {}
  for (const key of filterKeys) {
    const value = params.get(key)
    if (value) filters[key] = value
  }
  return {
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
    page_size: Math.max(1, parseInt(params.get('page_size') || '50', 10) || 50),
    search: params.get('search') || '',
    sort: params.get('sort') || '',
    filters,
  }
}

function writeQueryToUrl(query: TableQuery) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const setOrDelete = (key: string, value: string, defaultValue: string) => {
    if (value && value !== defaultValue) params.set(key, value)
    else params.delete(key)
  }
  setOrDelete('page', String(query.page), '1')
  setOrDelete('page_size', String(query.page_size), '50')
  setOrDelete('search', query.search, '')
  setOrDelete('sort', query.sort, '')
  for (const [key, value] of Object.entries(query.filters)) {
    setOrDelete(key, value, '')
  }
  const next = params.toString()
  const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
  window.history.replaceState(window.history.state, '', url)
}

export function useServerTable<Row>(
  fetcher: TableFetcher<Row>,
  options?: {
    /** Filter keys this page owns, so back/forward restores them. */
    filterKeys?: string[]
    /** Extra params sent on every request but never written to the URL. */
    staticParams?: Record<string, string | number>
    /** Debounce for search input, ms. */
    searchDebounce?: number
  },
) {
  const filterKeys = useMemo(() => options?.filterKeys ?? [], [options?.filterKeys])
  const staticParams = options?.staticParams
  const debounceMs = options?.searchDebounce ?? 350

  const [query, setQuery] = useState<TableQuery>(() => readQueryFromUrl(filterKeys))
  const [data, setData] = useState<TablePage<Row> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumping this refetches with the current query (retry after an error, or
  // refresh after a row action changed server state).
  const [refreshTick, setRefreshTick] = useState(0)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Back/forward must restore the view the URL describes.
  useEffect(() => {
    const onPop = () => setQuery(readQueryFromUrl(filterKeys))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [filterKeys])

  useEffect(() => {
    writeQueryToUrl(query)
    const controller = new AbortController()
    let cancelled = false

    setLoading(true)
    setError(null)

    const params: Record<string, string | number> = {
      page: query.page,
      page_size: query.page_size,
      ...(query.search ? { search: query.search } : {}),
      ...(query.sort ? { ordering: query.sort } : {}),
      ...query.filters,
      ...(staticParams || {}),
    }

    fetcher(params, controller.signal)
      .then((pageData) => {
        if (cancelled) return
        setData(pageData)
        // Deleting the last row of the final page leaves you past the end;
        // snap back instead of showing a phantom empty page.
        if (pageData.total_pages > 0 && query.page > pageData.total_pages) {
          setQuery((q) => ({ ...q, page: pageData.total_pages }))
        }
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return
        const detail =
          (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
        setError(detail?.message || detail?.error || 'This list could not be loaded.')
        setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
    // staticParams is spread into params; callers pass a literal, so it is
    // keyed by its JSON identity rather than reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, query, refreshTick, JSON.stringify(staticParams)])

  const setPage = useCallback((page: number) => {
    setQuery((q) => ({ ...q, page: Math.max(1, page) }))
  }, [])

  const setPageSize = useCallback((page_size: number) => {
    setQuery((q) => ({ ...q, page_size, page: 1 }))
  }, [])

  const setSearch = useCallback(
    (search: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        setQuery((q) => ({ ...q, search, page: 1 }))
      }, debounceMs)
    },
    [debounceMs],
  )

  const setSort = useCallback((sort: string) => {
    setQuery((q) => ({ ...q, sort, page: 1 }))
  }, [])

  const setFilter = useCallback((key: string, value: string) => {
    setQuery((q) => {
      const filters = { ...q.filters }
      if (value) filters[key] = value
      else delete filters[key]
      return { ...q, filters, page: 1 }
    })
  }, [])

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), [])

  return {
    query,
    rows: data?.results ?? [],
    count: data?.count ?? 0,
    totalPages: data?.total_pages ?? 0,
    loading,
    error,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
    refresh,
  }
}

export type ServerTableState<Row> = ReturnType<typeof useServerTable<Row>>

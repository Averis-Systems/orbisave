import axios from 'axios'
import { useAuthStore } from '@/store/auth'

/**
 * All requests go through the same-origin proxy (/api/backend/*), which
 * holds the JWTs in httpOnly cookies, attaches them server-side, and
 * refreshes them transparently. Browser JavaScript never sees a token —
 * there is nothing here for an XSS payload to steal.
 */
export const api = axios.create({
  baseURL: '/api/backend/',
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Normalise a list response to a plain array.
 *
 * The backend returns list data in three different shapes and hooks were
 * unwrapping by hand, inconsistently:
 *   1. { success, data: [...], meta }  the common success envelope
 *   2. { count, next, previous, results: [...] }  DRF pagination, returned by
 *      any plain ModelViewSet such as PenaltyViewSet
 *   3. a bare array
 *
 * Guessing wrong does not fail loudly at the boundary: the hook hands an
 * object to a component that calls .filter on it and the whole page crashes.
 * That is exactly how the fines page broke. Always route list responses
 * through this.
 */
export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.results)) return record.results as T[]
    if (Array.isArray(record.data)) return record.data as T[]
    // Paginated envelope nested inside a success envelope.
    if (record.data && typeof record.data === 'object') {
      const inner = record.data as Record<string, unknown>
      if (Array.isArray(inner.results)) return inner.results as T[]
    }
  }
  return []
}

api.interceptors.request.use((config) => {
  // Normalize URL: remove the leading slash so paths stay relative to baseURL.
  if (config.url?.startsWith('/')) {
    config.url = config.url.substring(1)
  }

  const country = useAuthStore.getState().user?.country
  if (country && !config.headers['X-Country']) {
    config.headers['X-Country'] = country
  }

  return config
})

// The proxy already retried with a refreshed token before a 401 reaches us,
// so a 401 here means the session is genuinely over.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url: string = error.config?.url || ''
    const isAuthAttempt = url.includes('auth/token') || url.includes('auth/register') || url.includes('password-reset')

    if (status === 401 && !isAuthAttempt && typeof window !== 'undefined') {
      const onAuthPage = ['/login', '/register', '/verify', '/forgot-password', '/onboarding', '/chama-onboarding']
        .some((page) => window.location.pathname.startsWith(page))
      if (!onAuthPage) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

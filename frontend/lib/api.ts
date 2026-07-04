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

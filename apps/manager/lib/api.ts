import axios from 'axios'
import { useAuthStore } from '@/store/auth'

/**
 * All Manager traffic goes through the same-origin proxy at /api/backend,
 * which holds the JWT in httpOnly cookies and attaches it server-side. There
 * is deliberately no token handling here: browser JavaScript never sees a JWT,
 * so an injected script has nothing to exfiltrate.
 *
 * X-Country is no longer sent from here either. CountryMiddleware runs before
 * JWT authentication, so on admin traffic that header is what actually picks
 * the country database, and sending it from the browser let the client choose
 * which country's data it read. The proxy now derives it from the country
 * claim in the verified token.
 */
export const api = axios.create({
  baseURL: '/api/backend',
  headers: {
    'Content-Type': 'application/json',
  },
  // Same-origin, but explicit so the session cookies ride every request.
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // The proxy has already cleared the cookies. Drop the cached profile so
      // the shell cannot keep rendering as though someone is signed in.
      useAuthStore.getState().clear()
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

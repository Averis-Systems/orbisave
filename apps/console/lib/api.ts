import axios from 'axios'
import { useAuthStore } from '@/store/auth'

/**
 * All Console traffic goes through the same-origin proxy at /api/backend,
 * which holds the JWT in httpOnly cookies and attaches it server-side. There
 * is deliberately no token handling here: browser JavaScript never sees a JWT,
 * so an injected script has nothing to exfiltrate.
 *
 * X-Country is not sent. It is client-controlled and CountryMiddleware runs
 * before JWT authentication, so it was never a safe way to choose which
 * country database a request reads. Views that need a country take an
 * authorisation-checked ?country= parameter instead.
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

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Cached profile for rendering, not an authorisation record.
 *
 * The session itself lives in httpOnly cookies set by /api/backend, so nothing
 * here is trusted by anything that matters. Country in particular is display
 * only now: the database a request reads is chosen from the country claim in
 * the signed token, server-side, so editing this in storage changes what this
 * browser draws and nothing else.
 *
 * The token is deliberately gone. It used to be held here and in a js-cookie
 * readable cookie, within reach of any script running on the page.
 */
interface User {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'platform_admin'
  country: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User) => void
  /** Forget the cached profile without calling the server (401 handling). */
  clear: () => void
  /** Sign out: drops the server session cookies, then the cached profile. */
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user) => set({ user, isAuthenticated: true }),
      clear: () => set({ user: null, isAuthenticated: false }),
      logout: async () => {
        try {
          // The cookies are httpOnly, so only the server can clear them.
          // Logout has to be a request now, not a local state reset.
          await fetch('/api/backend/auth/logout/', { method: 'POST' })
        } catch {
          // A network failure still clears local state. The access cookie
          // expires within 20 minutes and refresh rotation blacklists the
          // chain on its next use.
        }
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'orbisave-manager-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

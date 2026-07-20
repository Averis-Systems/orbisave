import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Cached profile for rendering, not an authorisation record.
 *
 * The session itself lives in httpOnly cookies set by /api/backend, so nothing
 * here is trusted by anything that matters. Someone who edits this in storage
 * changes what their own browser draws and nothing else: middleware reads the
 * role from the signed token, and the backend checks it again on every call.
 *
 * The token is deliberately gone. It used to be held here and in a js-cookie
 * readable cookie, which put a live super_admin JWT within reach of any script
 * running on the page.
 */
interface User {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'platform_admin'
  country?: string
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
      name: 'orbisave-console-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

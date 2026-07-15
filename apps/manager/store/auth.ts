import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'platform_admin'
  country: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, remember?: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token, remember = true) => {
        // Unchecked "Remember me" -> session cookie (dies when the browser
        // closes) instead of a 7-day persistent one. Real behavior change,
        // not a decorative checkbox.
        Cookies.set('access_token', token, {
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          ...(remember ? { expires: 7 } : {}),
        })
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        Cookies.remove('access_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'orbisave-manager-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

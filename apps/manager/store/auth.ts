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
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        Cookies.set('access_token', token, { 
          secure: process.env.NODE_ENV === 'production', 
          sameSite: 'strict', 
          expires: 7 
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

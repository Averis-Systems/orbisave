import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  full_name: string
  role: 'member' | 'chairperson' | 'treasurer' | 'platform_admin' | 'super_admin'
  country: string
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateKycStatus: (status: User['kyc_status']) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        // Also set token in cookie for middleware/SSR access if needed
        Cookies.set('access_token', token, { secure: true, sameSite: 'strict', expires: 7 })
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        Cookies.remove('access_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
      updateKycStatus: (status) =>
        set((state) => ({
          user: state.user ? { ...state.user, kyc_status: status } : null,
        })),
    }),
    {
      name: 'orbisave-auth-storage',
      // We only persist the user object, not the token (which lives in cookies/memory for security)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

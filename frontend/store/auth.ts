import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

const getAuthCookieOptions = () => ({
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  expires: 7,
  path: '/',
})

interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: 'member' | 'chairperson' | 'treasurer' | 'platform_admin' | 'super_admin'
  country: string
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected'
  gender?: string
  next_of_kin_name?: string
  next_of_kin_phone?: string
  disbursement_method?: 'mobile_money' | 'bank_transfer'
  bank_name?: string
  bank_account_number?: string
  onboarding_popup_seen?: boolean
  languages?: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, refreshToken?: string) => void
  setUser: (user: User) => void
  logout: () => void
  updateKycStatus: (status: User['kyc_status']) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token, refreshToken) => {
        // Also set token in cookie for middleware/SSR access if needed
        const cookieOptions = getAuthCookieOptions()
        Cookies.set('access_token', token, cookieOptions)
        if (refreshToken) Cookies.set('refresh_token', refreshToken, cookieOptions)
        set({ user, token, isAuthenticated: true })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        Cookies.remove('access_token', { path: '/' })
        Cookies.remove('refresh_token', { path: '/' })
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

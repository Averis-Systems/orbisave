import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  phone_verified?: boolean
  // The real account gate: login is blocked until this is true.
  email_verified?: boolean
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
  isAuthenticated: boolean
  /**
   * Tokens live exclusively in httpOnly cookies managed by the /api/backend
   * proxy — the store only holds the user profile. The optional second
   * argument is accepted (and ignored) for backwards compatibility.
   */
  setAuth: (user: User, _token?: string, _refreshToken?: string) => void
  setUser: (user: User) => void
  logout: () => void
  updateKycStatus: (status: User['kyc_status']) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user) => {
        set({ user, isAuthenticated: true })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        // Fire-and-forget: the proxy clears the httpOnly auth cookies.
        if (typeof window !== 'undefined') {
          void fetch('/api/backend/auth/logout/', { method: 'POST' }).catch(() => {})
        }
        set({ user: null, isAuthenticated: false })
      },
      updateKycStatus: (status) =>
        set((state) => ({
          user: state.user ? { ...state.user, kyc_status: status } : null,
        })),
    }),
    {
      name: 'orbisave-auth-storage',
      // Only the user profile is persisted — never any credential material.
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

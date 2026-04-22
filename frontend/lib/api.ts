import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach JWT token from cookies or store
api.interceptors.request.use(
  (config) => {
    // Attempt to get token from cookie first (more reliable across tabs), then fallback to store
    const token = Cookies.get('access_token') || useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Handle 401s (Token Expiry) globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we receive a 401 Unauthorized, automatically log the user out
    // Re-authentication/refresh logic can be expanded here if the backend issues refresh tokens
    if (error.response?.status === 401) {
      // Avoid logging out on the login route itself
      if (!error.config.url?.includes('/auth/login')) {
        useAuthStore.getState().logout()
        // Optional: redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

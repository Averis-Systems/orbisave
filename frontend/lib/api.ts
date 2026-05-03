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
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const country = useAuthStore.getState().user?.country
    if (country) {
      config.headers['X-Country'] = country
    }

    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void, reject: (err: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token as string)
    }
  })
  failedQueue = []
}

// Response Interceptor: Handle 401s (Token Expiry) globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token
          return api(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = Cookies.get('refresh_token')
        if (!refreshToken) {
            throw new Error("No refresh token available")
        }
        
        // Assuming backend endpoint is /auth/refresh
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
        const { access_token, refresh_token: new_refresh_token } = data

        Cookies.set('access_token', access_token, { secure: true, sameSite: 'strict', expires: 7 })
        if (new_refresh_token) {
          Cookies.set('refresh_token', new_refresh_token, { secure: true, sameSite: 'strict', expires: 7 })
        }
        
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          useAuthStore.getState().setAuth(currentUser, access_token)
        }

        api.defaults.headers.common['Authorization'] = 'Bearer ' + access_token
        originalRequest.headers['Authorization'] = 'Bearer ' + access_token

        processQueue(null, access_token)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        Cookies.remove('refresh_token')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

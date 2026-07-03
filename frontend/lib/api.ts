import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

const getAuthCookieOptions = () => ({
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  expires: 7,
  path: '/',
})

export const api = axios.create({
  baseURL: API_URL.endsWith('/') ? API_URL : `${API_URL}/`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach JWT token from cookies or store
api.interceptors.request.use(
  (config) => {
    // Normalize URL: Remove leading slash to ensure it's relative to baseURL (api/v1/)
    if (config.url?.startsWith('/')) {
      config.url = config.url.substring(1)
    }

    // Attempt to get token from cookie first (more reliable across tabs), then fallback to store
    const token = Cookies.get('access_token') || useAuthStore.getState().token
    const isAuthRoute = 
      config.url?.includes('auth/token/') || 
      config.url?.includes('auth/register/') ||
      config.url?.includes('admin-portal/auth/')
    
    if (token && !config.headers.Authorization && !isAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const country = useAuthStore.getState().user?.country
    if (country) {
      config.headers['X-Country'] = country
    }

    console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`, {
      baseURL: config.baseURL,
      headers: { ...config.headers, Authorization: config.headers.Authorization ? 'Bearer [REDACTED]' : undefined }
    })

    return config
  },
  (error) => {
    console.error('[API] Request Error:', error.message)
    return Promise.reject(error)
  }
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

    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
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
        
        // Standard SimpleJWT refresh endpoint
        const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh: refreshToken })
        const { access, refresh: new_refresh_token } = data

        const cookieOptions = getAuthCookieOptions()
        Cookies.set('access_token', access, cookieOptions)
        if (new_refresh_token) {
          Cookies.set('refresh_token', new_refresh_token, cookieOptions)
        }
        
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          useAuthStore.getState().setAuth(currentUser, access)
        }

        api.defaults.headers.common['Authorization'] = 'Bearer ' + access
        originalRequest.headers['Authorization'] = 'Bearer ' + access

        processQueue(null, access)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        Cookies.remove('refresh_token', { path: '/' })
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

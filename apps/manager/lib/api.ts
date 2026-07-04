import axios from 'axios'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/store/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    const isAuthRoute = config.url?.includes('/auth/login') || config.url?.includes('/auth/register')

    if (token && !config.headers.Authorization && !isAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Country context for the backend's per-country database routing.
    // CountryMiddleware runs before JWT auth, so the header is the ONLY
    // reliable signal on authenticated admin traffic — the manager portal
    // is country-scoped and MUST send it.
    const country = useAuthStore.getState().user?.country
    if (country && !config.headers['X-Country']) {
      config.headers['X-Country'] = country
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('access_token')
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

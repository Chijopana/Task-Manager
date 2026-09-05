import axios from 'axios'
import { clearSession, getToken } from './auth'

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(
  /\/+$/,
  '',
)

export const api = axios.create({ baseURL, timeout: 15000 })

// One place that attaches the token, instead of every call building its own headers.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or invalid session should send the user to the login screen
    // rather than leaving them on a page that silently fails.
    if (error.response?.status === 401) {
      clearSession()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1')
      }
    }
    return Promise.reject(error)
  },
)

/** Turns an axios error into something worth showing a user. */
export function errorMessage(error, fallback = 'Algo ha ido mal') {
  if (error.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder'
  if (error.message === 'Network Error') return 'No se pudo conectar con el servidor'
  return error.response?.data?.msg || fallback
}

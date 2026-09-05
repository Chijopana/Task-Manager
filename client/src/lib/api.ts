import axios, { AxiosError } from 'axios'
import { clearSession, getToken } from './session'

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '')

export const api = axios.create({ baseURL, timeout: 20_000 })

// Un único sitio pone el token, en lugar de que cada llamada arme su cabecera.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type UnauthorizedHandler = (reason: 'expired' | 'revoked') => void

let onUnauthorized: UnauthorizedHandler | null = null

/**
 * El interceptor no puede navegar por su cuenta: `window.location.assign`
 * recargaba la página entera y tiraba el estado de React en una aplicación que
 * tiene un router precisamente para evitarlo. Aquí lo registra un componente
 * que sí tiene acceso a `navigate`.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler
}

/** Rutas donde un 401 significa «credenciales incorrectas», no «sesión caducada». */
const CREDENTIAL_ROUTES = ['/api/users/login', '/api/users/register']

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code?: string }>) => {
    const url = error.config?.url ?? ''
    const isCredentialAttempt = CREDENTIAL_ROUTES.some((route) => url.startsWith(route))

    if (error.response?.status === 401 && !isCredentialAttempt) {
      clearSession()
      const revoked = error.response.data?.code === 'TOKEN_REVOKED'
      onUnauthorized?.(revoked ? 'revoked' : 'expired')
    }

    return Promise.reject(error)
  },
)

/** Convierte un error de axios en algo que merezca la pena enseñar a alguien. */
export function errorMessage(error: unknown, fallback = 'Algo ha ido mal'): string {
  if (!axios.isAxiosError(error)) return fallback
  if (error.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder'
  if (error.code === 'ERR_NETWORK') return 'No se pudo conectar con el servidor'

  const data = error.response?.data as { msg?: string } | undefined
  return data?.msg ?? fallback
}

/** Error con el mensaje ya listo para la interfaz. */
export class ApiError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined

  constructor(error: unknown, fallback: string) {
    super(errorMessage(error, fallback))
    this.name = 'ApiError'
    if (axios.isAxiosError(error)) {
      this.status = error.response?.status
      this.code = (error.response?.data as { code?: string } | undefined)?.code
    }
  }
}

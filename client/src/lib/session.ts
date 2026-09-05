import type { PublicUser } from '@task-manager/shared'

const TOKEN_KEY = 'tm.token'
const USER_KEY = 'tm.user'

export interface Session {
  token: string
  user: PublicUser
}

/**
 * Lee el `exp` del token sin traerse una librería de JWT.
 *
 * Solo sirve para no enseñar una pantalla de sesión iniciada con un token ya
 * muerto: la firma la verifica el servidor en cada petición, y nada de lo que
 * se decida aquí concede acceso a nada.
 */
function readExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const exp = readExpiry(token)
  if (exp === null) return true
  return exp * 1000 <= Date.now()
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Almacenamiento bloqueado (modo privado, cookies de terceros): sin sesión.
    return null
  }
}

export function readSession(): Session | null {
  const token = safeRead(TOKEN_KEY)
  const rawUser = safeRead(USER_KEY)
  if (!token || !rawUser) return null
  if (isTokenExpired(token)) return null

  // Lo que hay en localStorage es editable desde la consola del navegador, así
  // que se comprueba la forma antes de creérselo. No es una medida de
  // seguridad —el servidor no confía en esto para nada— sino la diferencia
  // entre descartar un valor corrupto y romper la pantalla al pintarlo.
  try {
    const user: unknown = JSON.parse(rawUser)
    if (!isPublicUser(user)) return null
    return { token, user }
  } catch {
    return null
  }
}

function isPublicUser(value: unknown): value is PublicUser {
  if (typeof value !== 'object' || value === null) return false
  const u = value as Record<string, unknown>
  return (
    typeof u.id === 'string' &&
    typeof u.username === 'string' &&
    typeof u.createdAt === 'string'
  )
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  } catch {
    /* sin almacenamiento la sesión dura lo que la pestaña */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* nada que limpiar */
  }
}

export function getToken(): string | null {
  return readSession()?.token ?? null
}

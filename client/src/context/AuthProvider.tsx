import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthResponse, PublicUser } from '@task-manager/shared'

import { setUnauthorizedHandler } from '../lib/api'
import { clearSession, getToken, readSession, saveSession } from '../lib/session'
import { fetchMe } from '../services/authService'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => readSession()?.user ?? null)
  const navigate = useNavigate()

  const signIn = useCallback((response: AuthResponse) => {
    saveSession(response)
    setUser(response.user)
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  /**
   * El interceptor de axios avisa aquí cuando el servidor rechaza la sesión, y
   * la navegación va por el router: antes se hacía `window.location.assign`,
   * que recargaba la aplicación entera y perdía todo el estado.
   */
  useEffect(() => {
    setUnauthorizedHandler((reason) => {
      clearSession()
      setUser(null)
      navigate(`/login?motivo=${reason}`, { replace: true })
    })

    return () => setUnauthorizedHandler(null)
  }, [navigate])

  /**
   * Al arrancar se contrasta la sesión con el servidor.
   *
   * Que el token no haya caducado solo dice que la fecha del `exp` es futura:
   * puede estar revocado, o el usuario guardado puede haberse editado a mano.
   * No bloquea el primer pintado —se parte de lo que hay en localStorage— y si
   * el servidor lo rechaza, el interceptor del 401 se encarga de echar fuera.
   */
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false

    void fetchMe()
      .then((fresh) => {
        if (!cancelled) {
          setUser(fresh)
          const token = getToken()
          if (token) saveSession({ token, user: fresh })
        }
      })
      .catch(() => {
        /* Un 401 ya lo gestiona el interceptor; un fallo de red no debe
           cerrar una sesión que probablemente siga siendo válida. */
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, signIn, signOut }),
    [user, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

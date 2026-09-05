import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  // Comprobar solo que existe un token dejaba pasar sesiones caducadas y
  // aterrizaba al usuario en una pantalla cuyas peticiones fallaban todas.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default PrivateRoute

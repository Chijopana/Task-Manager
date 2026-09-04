import { Navigate } from 'react-router-dom'
import { clearSession, hasValidSession } from '../lib/auth'

export default function PrivateRoute({ children }) {
  // Checking only that a token exists let an expired session through, landing
  // the user on a page whose every request then failed.
  if (!hasValidSession()) {
    clearSession()
    return <Navigate to="/login" replace />
  }

  return children
}

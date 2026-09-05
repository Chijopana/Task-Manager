import { createContext } from 'react'
import type { AuthResponse, PublicUser } from '@task-manager/shared'

export interface AuthContextValue {
  user: PublicUser | null
  isAuthenticated: boolean
  signIn: (response: AuthResponse) => void
  signOut: () => void
}

/**
 * Vive en su propio archivo porque Fast Refresh deja de funcionar en cualquier
 * módulo que exporte a la vez componentes y valores que no lo son.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

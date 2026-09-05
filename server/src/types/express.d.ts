import type { AuthUser } from '../middleware/auth'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Lo rellena el middleware `auth`. Ausente en las rutas públicas. */
      user?: AuthUser
    }
  }
}

export {}

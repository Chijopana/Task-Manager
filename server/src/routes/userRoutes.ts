import { Router, type RequestHandler } from 'express'

import { login, logoutAll, me, register } from '../controllers/authController'
import { auth } from '../middleware/auth'

export function createUserRouter(authLimiter: RequestHandler): Router {
  const router = Router()

  router.post('/register', authLimiter, register)
  router.post('/login', authLimiter, login)
  router.get('/me', auth, me)
  router.post('/logout-all', auth, logoutAll)

  return router
}

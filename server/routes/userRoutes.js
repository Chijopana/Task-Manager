const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()
const { register, login, me } = require('../controllers/authController')
const auth = require('../middleware/authMiddleware')

/**
 * Without this, guessing a password is just a matter of how fast you can send
 * requests.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Demasiados intentos. Prueba de nuevo en unos minutos.' },
  // The integration tests hit these routes far more often than a person would.
  skip: () => process.env.NODE_ENV === 'test',
})

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', auth, me)

module.exports = router

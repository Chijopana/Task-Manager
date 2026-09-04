const jwt = require('jsonwebtoken')
const env = require('../config/env')

function auth(req, res, next) {
  const authHeader = req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Token requerido' })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return res.status(401).json({ msg: 'Token requerido' })

  try {
    const decoded = jwt.verify(token, env.jwtSecret)
    req.user = { id: decoded.id }
    next()
  } catch (err) {
    // Let the client tell an expired session apart from a malformed token so
    // it can redirect to the login screen instead of failing silently.
    const expired = err.name === 'TokenExpiredError'
    res.status(401).json({
      msg: expired ? 'Sesión expirada' : 'Token inválido',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    })
  }
}

module.exports = auth

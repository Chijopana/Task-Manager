const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const env = require('../config/env')

const MIN_PASSWORD_LENGTH = 6

function signToken(user) {
  return jwt.sign({ id: user._id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
}

/**
 * The client validates too, but the API is public: anything reaching the
 * database has to be checked here as well.
 */
function validateCredentials(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!username || !password) {
    return { error: 'Usuario y contraseña son obligatorios' }
  }
  if (username.length < 3 || username.length > 30) {
    return { error: 'El usuario debe tener entre 3 y 30 caracteres' }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    }
  }

  return { username: username.toLowerCase(), password }
}

exports.register = async (req, res) => {
  const { username, password, error } = validateCredentials(req.body)
  if (error) return res.status(400).json({ msg: error })

  const exists = await User.findOne({ username })
  if (exists) return res.status(409).json({ msg: 'Ese usuario ya existe' })

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await User.create({ username, password: hashedPassword })

  // Return a token so the client can go straight in instead of asking the
  // user to type the same credentials again.
  res.status(201).json({ token: signToken(user), username: user.username })
}

exports.login = async (req, res) => {
  const { username, password, error } = validateCredentials(req.body)
  if (error) return res.status(400).json({ msg: error })

  // `password` is `select: false` in the schema, so ask for it explicitly.
  const user = await User.findOne({ username }).select('+password')
  // Same message for "no such user" and "wrong password": telling them apart
  // would let anyone enumerate accounts.
  if (!user) return res.status(401).json({ msg: 'Credenciales incorrectas' })

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) return res.status(401).json({ msg: 'Credenciales incorrectas' })

  res.json({ token: signToken(user), username: user.username })
}

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' })
  res.json({ username: user.username })
}

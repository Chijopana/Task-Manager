import type { RequestHandler } from 'express'
import bcrypt from 'bcryptjs'
import { loginSchema, registerSchema } from '@task-manager/shared'

import { env } from '../config/env'
import { conflict, notFound, unauthorized } from '../lib/httpError'
import { requireUser, signToken } from '../middleware/auth'
import { User, toPublicUser } from '../models/User'

/**
 * Hash de relleno para igualar el tiempo de respuesta cuando el usuario no
 * existe. Se calcula una sola vez, con el mismo coste que los hashes reales.
 */
let dummyHash: Promise<string> | undefined

function fillerHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('no-es-la-contrasena-de-nadie', env.bcryptRounds)
  return dummyHash
}

export const register: RequestHandler = async (req, res) => {
  const { username, password } = registerSchema.parse(req.body)

  const exists = await User.exists({ username })
  if (exists) throw conflict('Ese usuario ya existe', 'USER_EXISTS')

  const hashed = await bcrypt.hash(password, env.bcryptRounds)
  const user = await User.create({ username, password: hashed })

  // Se devuelve un token para que no haya que teclear las mismas credenciales
  // otra vez inmediatamente después de crear la cuenta.
  res.status(201).json({ token: signToken(user), user: toPublicUser(user) })
}

export const login: RequestHandler = async (req, res) => {
  const { username, password } = loginSchema.parse(req.body)

  const user = await User.findOne({ username }).select('+password +tokenVersion')

  /**
   * Se compara siempre, exista el usuario o no.
   *
   * Devolver el mismo mensaje en ambos casos no basta: si al no encontrar al
   * usuario respondiéramos sin llegar a bcrypt, la respuesta tardaría unos
   * pocos milisegundos frente a los ~250 ms del camino normal, y esa diferencia
   * permite recorrer una lista de nombres y quedarse con los que existen.
   */
  const hash = user?.password ?? (await fillerHash())
  const matches = await bcrypt.compare(password, hash)

  if (!user || !matches) {
    throw unauthorized('Credenciales incorrectas', 'BAD_CREDENTIALS')
  }

  res.json({ token: signToken(user), user: toPublicUser(user) })
}

export const me: RequestHandler = async (req, res) => {
  const { id } = requireUser(req)

  const user = await User.findById(id)
  if (!user) throw notFound('Usuario no encontrado', 'USER_NOT_FOUND')

  res.json({ user: toPublicUser(user) })
}

/**
 * Cierra la sesión en todos los dispositivos.
 *
 * Un JWT no se puede «borrar»: es válido hasta que caduca. Subir la versión de
 * sesión del usuario hace que todos los tokens firmados antes dejen de pasar la
 * comprobación del middleware, que es la forma de revocarlos de verdad.
 */
export const logoutAll: RequestHandler = async (req, res) => {
  const { id } = requireUser(req)

  await User.findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } })

  res.json({ msg: 'Sesión cerrada en todos los dispositivos' })
}

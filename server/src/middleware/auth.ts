import type { Request, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'

import { env } from '../config/env'
import { unauthorized } from '../lib/httpError'
import { User } from '../models/User'

export interface AuthUser {
  id: string
  username: string
}

export interface TokenPayload {
  sub: string
  username: string
  /** Versión de sesión del usuario en el momento de firmar. */
  v: number
}

export function signToken(user: { _id: unknown; username: string; tokenVersion?: number }): string {
  const payload: TokenPayload = {
    sub: String(user._id),
    username: user.username,
    v: user.tokenVersion ?? 0,
  }

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

function isTokenPayload(value: unknown): value is TokenPayload {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return typeof p.sub === 'string' && typeof p.username === 'string' && typeof p.v === 'number'
}

/**
 * Verifica la firma y, además, que la sesión no haya sido revocada.
 *
 * Comprobar `tokenVersion` cuesta una lectura indexada por petición, que es el
 * precio de poder cerrar sesión de verdad: un JWT es válido hasta que expira y
 * sin este contraste no habría forma de invalidar el token robado de alguien.
 */
export const auth: RequestHandler = async (req, _res, next) => {
  const header = req.header('Authorization')

  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Token requerido', 'TOKEN_MISSING'))
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) return next(unauthorized('Token requerido', 'TOKEN_MISSING'))

  let payload: unknown
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch (err) {
    // El cliente distingue una sesión caducada de un token corrupto para poder
    // avisar («tu sesión ha caducado») en vez de fallar en silencio.
    const expired = err instanceof jwt.TokenExpiredError
    return next(
      unauthorized(
        expired ? 'Sesión expirada' : 'Token inválido',
        expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      ),
    )
  }

  if (!isTokenPayload(payload)) {
    return next(unauthorized('Token inválido', 'TOKEN_INVALID'))
  }

  const user = await User.findById(payload.sub).select('+tokenVersion')
  if (!user) return next(unauthorized('Token inválido', 'TOKEN_INVALID'))

  if ((user.tokenVersion ?? 0) !== payload.v) {
    return next(unauthorized('Sesión cerrada en todos los dispositivos', 'TOKEN_REVOKED'))
  }

  req.user = { id: user._id.toString(), username: user.username }
  next()
}

/** Estrecha `req.user` a un valor presente sin sembrar de `!` los controladores. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized('Token requerido', 'TOKEN_MISSING')
  return req.user
}

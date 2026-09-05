import rateLimit from 'express-rate-limit'
import type { RequestHandler } from 'express'

export interface RateLimitOptions {
  /**
   * Se pasa al construir la app, no se lee de NODE_ENV: una variable de entorno
   * mal puesta en producción no puede apagar la protección sin querer.
   */
  enabled?: boolean
  windowMs?: number
  /** Intentos de registro y login por ventana. */
  authMax?: number
  /** Peticiones al resto de la API por ventana. */
  apiMax?: number
}

const passthrough: RequestHandler = (_req, _res, next) => next()

const DEFAULTS = {
  windowMs: 15 * 60 * 1000,
  authMax: 20,
  apiMax: 300,
} as const

export function createRateLimiters(options: RateLimitOptions = {}) {
  const enabled = options.enabled ?? true
  const windowMs = options.windowMs ?? DEFAULTS.windowMs

  if (!enabled) {
    return { auth: passthrough, api: passthrough }
  }

  const base = {
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
  } as const

  return {
    /** Sin esto, adivinar una contraseña es cuestión de peticiones por segundo. */
    auth: rateLimit({
      ...base,
      limit: options.authMax ?? DEFAULTS.authMax,
      // Los intentos correctos no gastan cuota: quien acierta a la primera no
      // debería quedarse fuera por culpa de otro que comparte su IP.
      skipSuccessfulRequests: true,
      message: { msg: 'Demasiados intentos. Prueba de nuevo en unos minutos.' },
    }),
    /**
     * Un token válido no debería poder llenar la base de datos: registrarse es
     * gratis, así que el límite del login no protege lo que hay detrás.
     */
    api: rateLimit({
      ...base,
      limit: options.apiMax ?? DEFAULTS.apiMax,
      message: { msg: 'Demasiadas peticiones. Espera un momento.' },
    }),
  }
}

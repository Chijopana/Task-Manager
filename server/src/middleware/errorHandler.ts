import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { Error as MongooseError } from 'mongoose'

import { env } from '../config/env'
import { HttpError } from '../lib/httpError'

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ msg: `No existe la ruta ${req.method} ${req.path}` })
}

interface Normalized {
  status: number
  msg: string
  code?: string
  /** Si es `false`, se registra en el log: es un fallo nuestro, no del cliente. */
  expected: boolean
}

function normalize(err: unknown): Normalized {
  if (err instanceof HttpError) {
    return { status: err.status, msg: err.message, code: err.code, expected: err.expected }
  }

  // Un cuerpo o una query que no cumplen el esquema compartido.
  if (err instanceof ZodError) {
    const first = err.issues[0]
    const field = first?.path.join('.')
    return {
      status: 400,
      msg: first?.message ?? 'Datos inválidos',
      code: field ? `INVALID_${field.toUpperCase()}` : 'INVALID_BODY',
      expected: true,
    }
  }

  // `/api/tasks/no-es-un-id`: un identificador que Mongo no puede interpretar.
  if (err instanceof MongooseError.CastError) {
    return { status: 400, msg: 'Identificador inválido', code: 'INVALID_ID', expected: true }
  }

  if (err instanceof MongooseError.ValidationError) {
    const first = Object.values(err.errors)[0]
    return {
      status: 400,
      msg: first?.message ?? 'Datos inválidos',
      code: 'INVALID_BODY',
      expected: true,
    }
  }

  // Violación de índice único: dos cuentas con el mismo nombre.
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    return { status: 409, msg: 'Ese usuario ya existe', code: 'USER_EXISTS', expected: true }
  }

  // JSON mal formado en el cuerpo: lo lanza express.json().
  if (
    err instanceof SyntaxError &&
    'body' in err &&
    (err as unknown as { status?: number }).status === 400
  ) {
    return { status: 400, msg: 'El cuerpo de la petición no es JSON válido', expected: true }
  }

  /**
   * body-parser y otros middlewares lanzan errores de `http-errors`, que ya
   * traen su propio estado. Sin este caso, un cuerpo de 200 KB acababa en el
   * 500 genérico y con su traza en el log, cuando es un rechazo previsto.
   */
  const carried = err as { status?: unknown; statusCode?: unknown; type?: unknown }
  const status = typeof carried.status === 'number' ? carried.status : carried.statusCode
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const known: Record<number, string> = {
      413: 'La petición es demasiado grande',
      415: 'Tipo de contenido no soportado',
    }
    return {
      status,
      msg: known[status] ?? 'Petición inválida',
      code: typeof carried.type === 'string' ? carried.type : undefined,
      expected: true,
    }
  }

  return { status: 500, msg: 'Error del servidor', expected: false }
}

/**
 * Único punto donde un error se convierte en respuesta. Express 5 reenvía aquí
 * las promesas rechazadas, así que los controladores no necesitan try/catch.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, msg, code, expected } = normalize(err)

  // Un origen no permitido o un 404 son sucesos normales. Registrarlos deja que
  // cualquiera llene el log mandando cabeceras al azar, y entierra los errores
  // que sí importan.
  if (!expected) {
    console.error('Error no controlado:', err)
  }

  res.status(status).json({
    msg,
    ...(code ? { code } : {}),
    // Los detalles internos no salen del servidor en producción.
    ...(env.isProduction || expected
      ? {}
      : { error: err instanceof Error ? err.message : String(err) }),
  })
}

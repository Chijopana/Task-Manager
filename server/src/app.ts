import express, { type Express } from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'

import { env } from './config/env'
import { forbidden } from './lib/httpError'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { createRateLimiters, type RateLimitOptions } from './middleware/rateLimit'
import { createTaskRouter } from './routes/taskRoutes'
import { createUserRouter } from './routes/userRoutes'

export interface AppOptions {
  rateLimit?: RateLimitOptions
}

/**
 * Construye la app sin tocar la base de datos ni abrir un puerto, para que los
 * tests de integración puedan usarla directamente.
 */
export function createApp(options: AppOptions = {}): Express {
  const app = express()
  const limiters = createRateLimiters(options.rateLimit)

  // Render y Vercel ponen un proxy delante: sin esto el limitador vería la IP
  // del proxy en todas las peticiones y contaría a todo el mundo como uno solo.
  app.set('trust proxy', env.trustProxy)
  app.disable('x-powered-by')

  app.use(helmet())

  app.use(
    cors({
      origin(origin, callback) {
        // Las peticiones del mismo origen y herramientas como curl no mandan Origin.
        if (!origin) return callback(null, true)
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        if (!env.isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          return callback(null, true)
        }

        // Un origen no permitido es una condición esperada, no un fallo del
        // servidor: 403 y sin traza en el log, que si no cualquiera puede
        // llenarlo mandando cabeceras Origin al azar.
        callback(forbidden(`Origen no permitido: ${origin}`, 'CORS_ORIGIN'))
      },
    }),
  )

  // El cuerpo de una tarea es diminuto; algo más grande es un error o un ataque.
  app.use(express.json({ limit: '10kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    })
  })

  app.get('/', (_req, res) => {
    res.json({ msg: 'Task Manager API', health: '/api/health' })
  })

  app.use('/api', limiters.api)
  app.use('/api/users', createUserRouter(limiters.auth))
  app.use('/api/tasks', createTaskRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')

const env = require('./config/env')
const userRoutes = require('./routes/userRoutes')
const taskRoutes = require('./routes/taskRoutes')
const { notFound, errorHandler } = require('./middleware/errorHandler')

/**
 * Builds the Express app without touching the database or opening a port, so
 * the integration tests can drive it directly.
 */
function createApp() {
  const app = express()

  // Render and Vercel sit in front of the app; without this the rate limiter
  // would see the proxy's IP for every request.
  app.set('trust proxy', 1)

  app.use(helmet())

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests and tools like curl send no Origin header.
        if (!origin) return callback(null, true)
        if (!env.isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          return callback(null, true)
        }
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        return callback(new Error(`Origen no permitido: ${origin}`))
      },
    }),
  )

  // A task payload is tiny; anything larger is a mistake or an attack.
  app.use(express.json({ limit: '10kb' }))

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    })
  })

  app.get('/', (req, res) => {
    res.json({ msg: 'Task Manager API', health: '/api/health' })
  })

  app.use('/api/users', userRoutes)
  app.use('/api/tasks', taskRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp

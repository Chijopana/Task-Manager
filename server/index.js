const mongoose = require('mongoose')

const env = require('./config/env')
const createApp = require('./app')

async function start() {
  try {
    await mongoose.connect(env.mongoUri)
    console.log('✔ Conectado a MongoDB')
  } catch (err) {
    console.error('✖ No se pudo conectar a MongoDB:', err.message)
    process.exit(1)
  }

  const app = createApp()
  const server = app.listen(env.port, () =>
    console.log(`✔ API escuchando en el puerto ${env.port}`),
  )

  // Let in-flight requests finish when the host restarts the service.
  const shutdown = (signal) => {
    console.log(`\n${signal} recibido, cerrando...`)
    server.close(async () => {
      await mongoose.connection.close(false)
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()

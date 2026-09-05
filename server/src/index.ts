import mongoose from 'mongoose'

import { createApp } from './app'
import { env } from './config/env'

async function start(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri)
    console.log('✔ Conectado a MongoDB')
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error('✖ No se pudo conectar a MongoDB:', reason)
    process.exit(1)
  }

  // Los índices se crean al arrancar, no en la primera consulta: si falta el
  // índice compuesto, la consulta de listado ordena en memoria sin avisar.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()))

  const app = createApp()
  const server = app.listen(env.port, () =>
    console.log(`✔ API escuchando en el puerto ${env.port}`),
  )

  // Dejar terminar las peticiones en vuelo cuando el host reinicia el servicio.
  let shuttingDown = false
  const shutdown = (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n${signal} recibido, cerrando...`)

    server.close(() => {
      void mongoose.connection.close(false).then(() => process.exit(0))
    })

    // Si algo se queda colgado, no bloquear el reinicio indefinidamente.
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

void start()

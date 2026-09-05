/**
 * Arranca la API contra una MongoDB en memoria y desechable.
 *
 * Sirve para desarrollar o enseñar el proyecto sin un cluster de Atlas. Los
 * datos desaparecen al cerrar el proceso.
 *
 *   npm run dev:memory
 */
process.env.JWT_SECRET ??= 'clave-de-desarrollo-no-usar-en-produccion-0123456789abcdef'
process.env.MONGO_URI ??= 'mongodb://127.0.0.1:27017/placeholder'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

async function main(): Promise<void> {
  const mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  console.log('✔ MongoDB en memoria lista (los datos se pierden al cerrar)')

  // Se importan después de fijar las variables: config/env valida al cargarse.
  const { env } = await import('../config/env')
  const { createApp } = await import('../app')

  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()))

  const app = createApp()
  app.listen(env.port, () => console.log(`✔ API escuchando en http://localhost:${env.port}`))

  const shutdown = async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

main().catch((err: unknown) => {
  console.error('No se pudo arrancar el entorno en memoria:', err)
  process.exit(1)
})

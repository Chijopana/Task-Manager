/**
 * Runs the API against a throwaway in-memory MongoDB.
 *
 * Useful for developing or demoing without an Atlas cluster. Data disappears
 * when the process stops.
 *
 *   npm run dev:memory
 */
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'local-development-secret-not-for-production-0123456789'
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/placeholder'

async function main() {
  const mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()

  await mongoose.connect(uri)
  console.log('✔ MongoDB en memoria lista (los datos se pierden al cerrar)')

  const env = require('../config/env')
  const createApp = require('../app')

  const app = createApp()
  app.listen(env.port, () =>
    console.log(`✔ API escuchando en http://localhost:${env.port}`),
  )

  const shutdown = async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('No se pudo arrancar el entorno en memoria:', err)
  process.exit(1)
})

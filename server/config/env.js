const dotenv = require('dotenv')

dotenv.config()

/**
 * Fail at boot with a clear message instead of crashing on the first login
 * because JWT_SECRET happened to be undefined.
 */
const REQUIRED = ['MONGO_URI', 'JWT_SECRET']

const missing = REQUIRED.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error(
    `\n✖ Faltan variables de entorno obligatorias: ${missing.join(', ')}\n` +
      '  Copia server/.env.example a server/.env y rellena los valores.\n',
  )
  process.exit(1)
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn(
    '⚠ JWT_SECRET es corto. Usa al menos 32 caracteres aleatorios:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  )
}

const isProduction = process.env.NODE_ENV === 'production'

/** Origins allowed to call the API. Localhost stays open in development. */
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (isProduction && corsOrigins.length === 0) {
  console.warn(
    '⚠ CORS_ORIGINS está vacío en producción: se rechazarán todas las peticiones del navegador.',
  )
}

module.exports = {
  isProduction,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  port: process.env.PORT || 5000,
  corsOrigins,
}

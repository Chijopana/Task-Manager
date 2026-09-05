import 'dotenv/config'
import { z } from 'zod'

/**
 * La configuración se valida al arrancar y no en la primera petición: es mejor
 * no llegar a escuchar que descubrir que falta JWT_SECRET cuando alguien
 * intenta entrar.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().min(1, 'la cadena de conexión a MongoDB'),
  JWT_SECRET: z.string().min(1, 'la clave de firma de los tokens'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGINS: z.string().default(''),
  /** 12 rondas ≈ 250 ms en hardware modesto: caro para quien prueba en bloque,
   *  imperceptible para quien entra una vez. */
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  /** Render y Vercel ponen un proxy delante; sin esto el limitador vería
   *  siempre la IP del proxy. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((issue) => `  · ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  console.error(
    `\n✖ La configuración del servidor no es válida:\n${missing}\n\n` +
      '  Copia server/.env.example a server/.env y rellena los valores.\n',
  )
  process.exit(1)
}

const raw = parsed.data
const isProduction = raw.NODE_ENV === 'production'
const isTest = raw.NODE_ENV === 'test'

/**
 * Una clave corta se puede romper por fuerza bruta sin tocar el servidor: basta
 * con un token capturado. En producción es un error, no un aviso.
 */
if (raw.JWT_SECRET.length < 32) {
  const help =
    'Genera una con:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'

  if (isProduction) {
    console.error(`\n✖ JWT_SECRET debe tener al menos 32 caracteres. ${help}\n`)
    process.exit(1)
  }
  console.warn(`⚠ JWT_SECRET es corto (${raw.JWT_SECRET.length} caracteres). ${help}`)
}

const corsOrigins = raw.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (isProduction && corsOrigins.length === 0) {
  console.warn(
    '⚠ CORS_ORIGINS está vacío en producción: se rechazarán todas las peticiones del navegador.',
  )
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction,
  isTest,
  isDevelopment: raw.NODE_ENV === 'development',
  mongoUri: raw.MONGO_URI,
  jwtSecret: raw.JWT_SECRET,
  jwtExpiresIn: raw.JWT_EXPIRES_IN,
  port: raw.PORT,
  corsOrigins,
  bcryptRounds: raw.BCRYPT_ROUNDS,
  trustProxy: raw.TRUST_PROXY,
} as const

export type Env = typeof env

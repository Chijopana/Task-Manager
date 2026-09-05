/**
 * Se ejecuta antes de que ningún test importe `config/env`, que valida la
 * configuración en el momento de cargarse.
 */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'clave-de-test-suficientemente-larga-para-pasar-la-validacion-0123456789'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder'
process.env.CORS_ORIGINS = 'https://app.ejemplo.com'
// El coste real (12) haría que la suite tardase minutos; la lógica es la misma.
process.env.BCRYPT_ROUNDS = '4'

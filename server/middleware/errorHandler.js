const { isProduction } = require('../config/env')

function notFound(req, res) {
  res.status(404).json({ msg: 'Ruta no encontrada' })
}

/**
 * Single place where errors become responses. Express 5 forwards rejected
 * promises here automatically, so controllers don't need their own try/catch.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
function errorHandler(err, req, res, next) {
  // Invalid ObjectId in the URL (`/api/tasks/abc`)
  if (err.name === 'CastError') {
    return res.status(400).json({ msg: 'Identificador inválido' })
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({ msg: details[0] || 'Datos inválidos' })
  }

  // Unique index violation (two users with the same username)
  if (err.code === 11000) {
    return res.status(409).json({ msg: 'Ese usuario ya existe' })
  }

  console.error('Error no controlado:', err)

  res.status(err.status || 500).json({
    msg: 'Error del servidor',
    // Never leak internals to the client in production.
    ...(isProduction ? {} : { error: err.message }),
  })
}

module.exports = { notFound, errorHandler }

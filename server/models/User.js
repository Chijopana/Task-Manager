const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'El usuario es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true, // "Jose" and "jose" must be the same account
      minlength: [3, 'El usuario debe tener al menos 3 caracteres'],
      maxlength: [30, 'El usuario no puede superar los 30 caracteres'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      // Never ship the hash in a query result unless explicitly asked for.
      select: false,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('User', userSchema)

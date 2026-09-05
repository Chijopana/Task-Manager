import { Schema, model, type Types } from 'mongoose'
import { USERNAME_MAX, USERNAME_MIN, type PublicUser } from '@task-manager/shared'

export interface UserDoc {
  _id: Types.ObjectId
  username: string
  password: string
  /**
   * Se incrementa al cerrar sesión en todos los dispositivos. Un token firmado
   * con una versión anterior deja de valer, que es la única forma de revocar
   * un JWT sin mantener una lista negra.
   */
  tokenVersion: number
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDoc>(
  {
    username: {
      type: String,
      required: [true, 'El usuario es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true, // «Jose» y «jose» tienen que ser la misma cuenta
      minlength: [USERNAME_MIN, `El usuario debe tener al menos ${USERNAME_MIN} caracteres`],
      maxlength: [USERNAME_MAX, `El usuario no puede superar los ${USERNAME_MAX} caracteres`],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      // El hash no sale en una consulta salvo que se pida explícitamente.
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true },
)

export function toPublicUser(user: Pick<UserDoc, '_id' | 'username' | 'createdAt'>): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    createdAt: user.createdAt.toISOString(),
  }
}

export const User = model<UserDoc>('User', userSchema)

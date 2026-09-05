import { z } from 'zod'
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN } from './constants.js'

/**
 * El nombre se guarda siempre en minúsculas para que «Jose» y «jose» sean la
 * misma cuenta, y el conjunto de caracteres se restringe para que no se cuelen
 * nombres que solo se distinguen por un espacio invisible.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `El usuario debe tener al menos ${USERNAME_MIN} caracteres`)
  .max(USERNAME_MAX, `El usuario no puede superar los ${USERNAME_MAX} caracteres`)
  .regex(
    /^[a-z0-9._-]+$/,
    'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos',
  )

export const registerSchema = z.object({
  username: usernameSchema,
  password: z
    .string()
    .min(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`)
    .max(PASSWORD_MAX, `La contraseña no puede superar los ${PASSWORD_MAX} caracteres`),
})

/**
 * El login no aplica la política de contraseñas a propósito. Validar aquí el
 * mínimo dejaría fuera a cuentas creadas con reglas antiguas y, de paso, le
 * diría a cualquiera cuál es la política sin necesidad de registrarse.
 */
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'La contraseña es obligatoria').max(PASSWORD_MAX),
})

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  createdAt: z.string(),
})

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PublicUser = z.infer<typeof userSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>

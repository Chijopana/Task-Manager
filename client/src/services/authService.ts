import type { AuthResponse, PublicUser } from '@task-manager/shared'

import { api, ApiError } from '../lib/api'

export async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    const { data } = await api.post('/api/users/login', { username, password })
    return data as AuthResponse
  } catch (err) {
    throw new ApiError(err, 'No se pudo iniciar sesión')
  }
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  try {
    const { data } = await api.post('/api/users/register', { username, password })
    return data as AuthResponse
  } catch (err) {
    throw new ApiError(err, 'No se pudo crear la cuenta')
  }
}

/**
 * Confirma con el servidor que la sesión sigue viva y trae el nombre real.
 *
 * Lo que hay en localStorage es editable desde la consola del navegador y puede
 * haber quedado obsoleto; esta es la única fuente fiable de quién eres.
 */
export async function fetchMe(): Promise<PublicUser> {
  try {
    const { data } = await api.get('/api/users/me')
    return data.user as PublicUser
  } catch (err) {
    throw new ApiError(err, 'No se pudo comprobar la sesión')
  }
}

/** Invalida todos los tokens de la cuenta, no solo el de este navegador. */
export async function logoutEverywhere(): Promise<void> {
  try {
    await api.post('/api/users/logout-all')
  } catch (err) {
    throw new ApiError(err, 'No se pudo cerrar la sesión en todos los dispositivos')
  }
}

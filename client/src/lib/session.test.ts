import { beforeEach, describe, expect, test } from 'vitest'
import { clearSession, getToken, isTokenExpired, readSession, saveSession } from './session'

/** Construye un JWT con la firma inventada: aquí solo se lee el `exp`. */
function tokenExpiringIn(seconds: number): string {
  const payload = { sub: 'abc', username: 'jose', v: 0, exp: Math.floor(Date.now() / 1000) + seconds }
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma`
}

const user = { id: 'abc', username: 'jose', createdAt: '2026-01-01T00:00:00.000Z' }

beforeEach(() => localStorage.clear())

describe('isTokenExpired', () => {
  test('un token con vida por delante no está caducado', () => {
    expect(isTokenExpired(tokenExpiringIn(3600))).toBe(false)
  })

  test('un token pasado de fecha sí lo está', () => {
    expect(isTokenExpired(tokenExpiringIn(-10))).toBe(true)
  })

  test('lo que no es un token se trata como caducado', () => {
    expect(isTokenExpired('esto-no-es-un-jwt')).toBe(true)
    expect(isTokenExpired('')).toBe(true)
  })
})

describe('readSession', () => {
  test('devuelve la sesión guardada', () => {
    saveSession({ token: tokenExpiringIn(3600), user })
    expect(readSession()?.user.username).toBe('jose')
  })

  test('sin nada guardado no hay sesión', () => {
    expect(readSession()).toBeNull()
  })

  /**
   * Comprobar solo que existía un token dejaba pasar sesiones muertas, y el
   * usuario aterrizaba en una pantalla cuyas peticiones fallaban todas.
   */
  test('una sesión caducada cuenta como no haberla', () => {
    saveSession({ token: tokenExpiringIn(-1), user })
    expect(readSession()).toBeNull()
  })

  test('un usuario manipulado a mano se descarta en vez de romper la pantalla', () => {
    saveSession({ token: tokenExpiringIn(3600), user })
    localStorage.setItem('tm.user', '{"username": 12345}')

    expect(readSession()).toBeNull()
  })

  test('un usuario que no es JSON se descarta', () => {
    saveSession({ token: tokenExpiringIn(3600), user })
    localStorage.setItem('tm.user', 'no-es-json')

    expect(readSession()).toBeNull()
  })
})

describe('clearSession', () => {
  test('deja el almacenamiento sin rastro de la sesión', () => {
    saveSession({ token: tokenExpiringIn(3600), user })
    expect(getToken()).toBeTruthy()

    clearSession()

    expect(getToken()).toBeNull()
    expect(localStorage.getItem('tm.user')).toBeNull()
  })
})

import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import type { Express } from 'express'

import { clearDb, makeApp, registerUser, startTestDb, stopTestDb } from './helpers'
import { User } from '../src/models/User'

let app: Express

beforeAll(async () => {
  await startTestDb()
  app = makeApp()
})
afterAll(stopTestDb)
beforeEach(clearDb)

describe('registro', () => {
  test('devuelve un token para entrar directamente, sin repetir credenciales', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'jose', password: 'secret1234' })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user).toMatchObject({ username: 'jose' })
    expect(res.body.user.id).toBeTruthy()
  })

  test('rechaza contraseñas por debajo del mínimo', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'jose', password: 'corta1' })

    expect(res.status).toBe(400)
    expect(res.body.msg).toMatch(/al menos 8/)
  })

  test('rechaza nombres de usuario con caracteres que no son visibles', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'jo se\u200b', password: 'secret1234' })

    expect(res.status).toBe(400)
  })

  test('"Jose" y "jose" son la misma cuenta', async () => {
    await registerUser(app, 'Jose')

    const res = await request(app)
      .post('/api/users/register')
      .send({ username: 'jose', password: 'secret1234' })

    expect(res.status).toBe(409)
  })
})

describe('login', () => {
  test('una contraseña incorrecta devuelve 401', async () => {
    await registerUser(app, 'jose')

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'jose', password: 'incorrectaaa' })

    expect(res.status).toBe(401)
  })

  test('la respuesta nunca incluye el hash de la contraseña', async () => {
    await registerUser(app, 'jose')

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'jose', password: 'secret1234' })

    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toContain('$2')
    expect(res.body.user.password).toBeUndefined()
  })

  /**
   * El fallo original no estaba en el mensaje —ya era el mismo en ambos casos—
   * sino en el tiempo: al no encontrar al usuario se respondía sin llegar a
   * bcrypt, y esos ~250 ms de diferencia delataban qué cuentas existen.
   *
   * Medir tiempos en CI sería inestable, así que se comprueba la causa: que la
   * comparación se ejecuta también cuando el usuario no existe.
   */
  test('compara contra un hash de relleno aunque el usuario no exista', async () => {
    const spy = vi.spyOn(bcrypt, 'compare')

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'noexisteestacuenta', password: 'loquesea1234' })

    expect(res.status).toBe(401)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('el mensaje es idéntico exista el usuario o no', async () => {
    await registerUser(app, 'jose')

    const noUser = await request(app)
      .post('/api/users/login')
      .send({ username: 'fantasma', password: 'loquesea1234' })
    const badPass = await request(app)
      .post('/api/users/login')
      .send({ username: 'jose', password: 'loquesea1234' })

    expect(noUser.body).toEqual(badPass.body)
  })

  /**
   * Aplicar la política de contraseñas en el login dejaría fuera a las cuentas
   * creadas con reglas antiguas y, de paso, revelaría cuál es la política.
   */
  test('no aplica la política de longitud: una cuenta antigua sigue entrando', async () => {
    await User.create({
      username: 'antigua',
      password: await bcrypt.hash('corta', 4),
    })

    const res = await request(app)
      .post('/api/users/login')
      .send({ username: 'antigua', password: 'corta' })

    expect(res.status).toBe(200)
  })
})

describe('sesión', () => {
  test('/me devuelve el usuario del token', async () => {
    const session = await registerUser(app, 'jose')

    const res = await session.auth(request(app).get('/api/users/me'))

    expect(res.status).toBe(200)
    expect(res.body.user.username).toBe('jose')
  })

  test('/me exige token', async () => {
    const res = await request(app).get('/api/users/me')
    expect(res.status).toBe(401)
  })

  /** Un JWT vale hasta que caduca; la única forma de revocarlo es invalidarlo. */
  test('cerrar sesión en todos los dispositivos invalida los tokens ya emitidos', async () => {
    const session = await registerUser(app, 'jose')

    const before = await session.auth(request(app).get('/api/users/me'))
    expect(before.status).toBe(200)

    const out = await session.auth(request(app).post('/api/users/logout-all'))
    expect(out.status).toBe(200)

    const after = await session.auth(request(app).get('/api/users/me'))
    expect(after.status).toBe(401)
    expect(after.body.code).toBe('TOKEN_REVOKED')
  })
})

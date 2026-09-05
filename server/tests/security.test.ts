import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import type { Express } from 'express'
import { MAX_TASKS_PER_USER } from '@task-manager/shared'

import {
  clearDb,
  createTask,
  makeApp,
  registerUser,
  startTestDb,
  stopTestDb,
} from './helpers'
import { Task } from '../src/models/Task'

let app: Express

beforeAll(async () => {
  await startTestDb()
  app = makeApp()
})
afterAll(stopTestDb)
beforeEach(clearDb)

describe('autenticacion de las rutas de tareas', () => {
  test('sin token no se listan tareas', async () => {
    const res = await request(app).get('/api/tasks')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('TOKEN_MISSING')
  })

  test('un token con formato invalido se rechaza', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer no-es-un-token')

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('TOKEN_INVALID')
  })

  test('un token firmado con otra clave se rechaza', async () => {
    // Cabecera y cuerpo validos, firma inventada.
    const fake =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4IiwidXNlcm5hbWUiOiJ4IiwidiI6MH0.firma-falsa'

    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${fake}`)

    expect(res.status).toBe(401)
  })
})

describe('aislamiento entre cuentas', () => {
  test('cada usuario solo ve sus propias tareas', async () => {
    const a = await registerUser(app, 'usuarioa')
    const b = await registerUser(app, 'usuariob')

    await createTask(app, a, { title: 'Tarea de A' })

    const res = await b.auth(request(app).get('/api/tasks'))

    expect(res.status).toBe(200)
    expect(res.body.tasks).toEqual([])
    expect(res.body.counts.all).toBe(0)
  })

  /**
   * Pasar el cuerpo entero a la actualizacion permitia mandar
   * `{ user: "<id de otro>" }` y regalarle la tarea a otra cuenta.
   */
  test('el campo user del cuerpo se ignora: no se puede regalar una tarea', async () => {
    const a = await registerUser(app, 'usuarioa')
    const b = await registerUser(app, 'usuariob')

    const task = await createTask(app, a, { title: 'Tarea de A' })

    const res = await a
      .auth(request(app).patch(`/api/tasks/${task.id}`))
      .send({ title: 'Secuestrada', user: b.userId })

    expect(res.status).toBe(200)

    const mine = await a.auth(request(app).get('/api/tasks'))
    expect(mine.body.tasks).toHaveLength(1)

    const theirs = await b.auth(request(app).get('/api/tasks'))
    expect(theirs.body.tasks).toEqual([])
  })

  test('editar la tarea de otro devuelve 404, no 200', async () => {
    const a = await registerUser(app, 'usuarioa')
    const b = await registerUser(app, 'usuariob')

    const task = await createTask(app, a, { title: 'Tarea de A' })

    const res = await b
      .auth(request(app).patch(`/api/tasks/${task.id}`))
      .send({ completed: true })

    expect(res.status).toBe(404)
  })

  test('borrar la tarea de otro devuelve 404 y no la borra', async () => {
    const a = await registerUser(app, 'usuarioa')
    const b = await registerUser(app, 'usuariob')

    const task = await createTask(app, a, { title: 'Tarea de A' })

    const res = await b.auth(request(app).delete(`/api/tasks/${task.id}`))
    expect(res.status).toBe(404)

    expect(await Task.countDocuments({})).toBe(1)
  })

  test('vaciar completadas no toca las de otra cuenta', async () => {
    const a = await registerUser(app, 'usuarioa')
    const b = await registerUser(app, 'usuariob')

    const suya = await createTask(app, b, { title: 'Hecha de B' })
    await b.auth(request(app).patch(`/api/tasks/${suya.id}`)).send({ completed: true })

    const res = await a.auth(request(app).delete('/api/tasks/completed'))

    expect(res.body.deleted).toBe(0)
    expect(await Task.countDocuments({})).toBe(1)
  })
})

describe('errores esperados', () => {
  test('una tarea inexistente devuelve 404, no un falso "eliminada"', async () => {
    const session = await registerUser(app)
    const fantasma = new mongoose.Types.ObjectId()

    const res = await session.auth(request(app).delete(`/api/tasks/${fantasma.toString()}`))
    expect(res.status).toBe(404)
  })

  test('un id con formato invalido devuelve 400, no un 500', async () => {
    const session = await registerUser(app)

    const res = await session.auth(request(app).delete('/api/tasks/no-es-un-id'))
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INVALID_ID')
  })

  test('una ruta que no existe devuelve 404 en JSON', async () => {
    const res = await request(app).get('/api/nope')

    expect(res.status).toBe(404)
    expect(res.body.msg).toBeTruthy()
  })

  test('un cuerpo que no es JSON valido devuelve 400', async () => {
    const session = await registerUser(app)

    const res = await session
      .auth(request(app).post('/api/tasks'))
      .set('Content-Type', 'application/json')
      .send('{ esto no es json')

    expect(res.status).toBe(400)
  })

  test('un cuerpo desmesurado se rechaza antes de procesarlo', async () => {
    const session = await registerUser(app)

    const res = await session
      .auth(request(app).post('/api/tasks'))
      .send({ title: 'x'.repeat(200_000) })

    expect(res.status).toBe(413)
  })
})

describe('CORS', () => {
  test('un origen permitido pasa', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://app.ejemplo.com')

    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('https://app.ejemplo.com')
  })

  /**
   * Antes esto acababa en el manejador generico: 500 y una traza completa en el
   * log por cada peticion. Cualquiera podia llenar los logs mandando cabeceras
   * Origin al azar.
   */
  test('un origen no permitido devuelve 403, no 500', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example')

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('CORS_ORIGIN')
  })

  test('un origen no permitido no deja rastro en el log', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await request(app).get('/api/health').set('Origin', 'https://evil.example')

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('limites de recursos', () => {
  /**
   * Registrarse es gratis, asi que el limite del login no protege lo que hay
   * detras: sin tope por cuenta, un token basta para llenar la base de datos.
   */
  test('no se pueden crear tareas sin fin', async () => {
    const session = await registerUser(app)

    await Task.insertMany(
      Array.from({ length: MAX_TASKS_PER_USER }, (_, i) => ({
        title: `Tarea ${i}`,
        user: new mongoose.Types.ObjectId(session.userId),
      })),
    )

    const res = await session.auth(request(app).post('/api/tasks')).send({ title: 'Una mas' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('TASK_LIMIT_REACHED')
  })

  /**
   * El limitador se configura al construir la app, no leyendo NODE_ENV: una
   * variable mal puesta en produccion no puede apagarlo sin querer.
   */
  test('el limitador se activa por configuracion, no por variable de entorno', async () => {
    const limited = makeApp({
      rateLimit: { enabled: true, authMax: 2, apiMax: 100, windowMs: 60_000 },
    })

    const intento = () =>
      request(limited).post('/api/users/login').send({ username: 'jose', password: 'fallo1234' })

    expect((await intento()).status).toBe(401)
    expect((await intento()).status).toBe(401)
    expect((await intento()).status).toBe(429)
  })
})

describe('cabeceras', () => {
  test('helmet esta puesto y no se anuncia el motor', async () => {
    const res = await request(app).get('/api/health')

    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })
})

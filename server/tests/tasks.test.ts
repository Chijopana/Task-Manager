import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

import {
  clearDb,
  createTask,
  makeApp,
  registerUser,
  startTestDb,
  stopTestDb,
  type TestSession,
} from './helpers'

let app: Express
let session: TestSession

beforeAll(async () => {
  await startTestDb()
  app = makeApp()
})
afterAll(stopTestDb)
beforeEach(async () => {
  await clearDb()
  session = await registerUser(app, 'jose')
})

const list = (query = '') => session.auth(request(app).get(`/api/tasks${query}`))
const titlesOf = (body: { tasks: { title: string }[] }) => body.tasks.map((t) => t.title)

describe('crear', () => {
  test('una tarea nueva nace pendiente, con prioridad media y sin fecha', async () => {
    const task = await createTask(app, session, { title: 'Comprar pan' })

    expect(task).toMatchObject({
      title: 'Comprar pan',
      completed: false,
      priority: 'medium',
      dueDate: null,
      tags: [],
      completedAt: null,
    })
    expect(task.id).toBeTruthy()
  })

  test('acepta fecha, prioridad y etiquetas', async () => {
    const task = await createTask(app, session, {
      title: 'Renovar el DNI',
      dueDate: '2026-12-01',
      priority: 'high',
      tags: ['papeleo'],
    })

    expect(task).toMatchObject({
      dueDate: '2026-12-01',
      priority: 'high',
      tags: ['papeleo'],
    })
  })

  test('normaliza las etiquetas y descarta las repetidas', async () => {
    const task = await createTask(app, session, {
      title: 'Pintar el salón',
      tags: ['#Casa', 'casa', ' Fin de semana '],
    })

    expect(task.tags).toEqual(['casa', 'fin-de-semana'])
  })

  test('un título en blanco devuelve 400', async () => {
    const res = await session.auth(request(app).post('/api/tasks')).send({ title: '   ' })
    expect(res.status).toBe(400)
  })

  test('rechaza una fecha que no existe en el calendario', async () => {
    const res = await session
      .auth(request(app).post('/api/tasks'))
      .send({ title: 'Imposible', dueDate: '2026-02-31' })

    expect(res.status).toBe(400)
    expect(res.body.msg).toMatch(/calendario/i)
  })

  test('rechaza una prioridad inventada', async () => {
    const res = await session
      .auth(request(app).post('/api/tasks'))
      .send({ title: 'Urgentisimo', priority: 'urgente' })

    expect(res.status).toBe(400)
  })
})

describe('listar y filtrar', () => {
  beforeEach(async () => {
    await createTask(app, session, {
      title: 'Vencida',
      dueDate: '2026-01-10',
      priority: 'high',
      tags: ['casa'],
    })
    await createTask(app, session, {
      title: 'Para hoy',
      dueDate: '2026-06-15',
      tags: ['casa'],
    })
    await createTask(app, session, {
      title: 'Sin fecha',
      priority: 'low',
      tags: ['trabajo'],
    })
  })

  test('devuelve contadores del conjunto completo, no solo de la pagina', async () => {
    const res = await list('?limit=1&today=2026-06-15')

    expect(res.status).toBe(200)
    expect(res.body.tasks).toHaveLength(1)
    expect(res.body.total).toBe(3)
    expect(res.body.hasMore).toBe(true)
    expect(res.body.counts).toMatchObject({ all: 3, pending: 3, completed: 0, overdue: 1 })
  })

  test('devuelve el vocabulario real de etiquetas con su recuento', async () => {
    const res = await list()

    expect(res.body.tags).toEqual([
      { tag: 'casa', count: 2 },
      { tag: 'trabajo', count: 1 },
    ])
  })

  test('filtra por etiqueta', async () => {
    const res = await list('?tag=trabajo')

    expect(res.body.tasks).toHaveLength(1)
    expect(res.body.tasks[0].title).toBe('Sin fecha')
  })

  test('filtra por prioridad', async () => {
    const res = await list('?priority=high')

    expect(res.body.tasks).toHaveLength(1)
    expect(res.body.tasks[0].title).toBe('Vencida')
  })

  test('filtra las vencidas contra el hoy que manda el cliente', async () => {
    const res = await list('?due=overdue&today=2026-06-15')

    expect(res.body.tasks).toHaveLength(1)
    expect(res.body.tasks[0].title).toBe('Vencida')
  })

  test('vencer hoy depende del dia del cliente, no del reloj del servidor', async () => {
    const res = await list('?due=today&today=2026-06-15')

    expect(res.body.tasks).toHaveLength(1)
    expect(res.body.tasks[0].title).toBe('Para hoy')
  })

  test('busca por titulo sin interpretar la busqueda como expresion regular', async () => {
    const res = await list('?search=.*')

    expect(res.body.tasks).toHaveLength(0)
  })

  test('ordenar por vencimiento deja al final las tareas sin fecha', async () => {
    const res = await list('?sort=due&order=asc')

    expect(titlesOf(res.body)).toEqual(['Vencida', 'Para hoy', 'Sin fecha'])
  })

  test('ordenar por prioridad usa la urgencia, no el alfabeto', async () => {
    const res = await list('?sort=priority&order=asc')

    // Alfabeticamente seria high < low < medium; lo correcto es high, medium, low.
    expect(res.body.tasks.map((t: { priority: string }) => t.priority)).toEqual([
      'high',
      'medium',
      'low',
    ])
  })

  test('una pagina fuera de rango devuelve una lista vacia, no un error', async () => {
    const res = await list('?page=99')

    expect(res.status).toBe(200)
    expect(res.body.tasks).toEqual([])
    expect(res.body.hasMore).toBe(false)
  })

  test('rechaza un tamano de pagina desmesurado', async () => {
    const res = await list('?limit=100000')
    expect(res.status).toBe(400)
  })
})

describe('actualizar y borrar', () => {
  test('completar una tarea guarda cuando se completo', async () => {
    const task = await createTask(app, session, { title: 'Comprar pan' })

    const res = await session
      .auth(request(app).patch(`/api/tasks/${task.id}`))
      .send({ completed: true })

    expect(res.status).toBe(200)
    expect(res.body.completed).toBe(true)
    expect(res.body.completedAt).toBeTruthy()
    expect(res.body.title).toBe('Comprar pan')
  })

  test('desmarcarla borra esa marca de tiempo', async () => {
    const task = await createTask(app, session, { title: 'Comprar pan' })

    await session.auth(request(app).patch(`/api/tasks/${task.id}`)).send({ completed: true })
    const res = await session
      .auth(request(app).patch(`/api/tasks/${task.id}`))
      .send({ completed: false })

    expect(res.body.completedAt).toBeNull()
  })

  test('un cuerpo sin ningun campo valido devuelve 400', async () => {
    const task = await createTask(app, session, { title: 'Comprar pan' })

    const res = await session
      .auth(request(app).patch(`/api/tasks/${task.id}`))
      .send({ inventado: true })

    expect(res.status).toBe(400)
  })

  test('quitar la fecha de vencimiento es posible mandando null', async () => {
    const task = await createTask(app, session, { title: 'Algo', dueDate: '2026-12-01' })

    const res = await session
      .auth(request(app).patch(`/api/tasks/${task.id}`))
      .send({ dueDate: null })

    expect(res.body.dueDate).toBeNull()
  })

  test('borrar devuelve el id de lo borrado', async () => {
    const task = await createTask(app, session, { title: 'Comprar pan' })

    const res = await session.auth(request(app).delete(`/api/tasks/${task.id}`))

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(task.id)
  })

  test('vaciar las completadas borra solo esas', async () => {
    const done = await createTask(app, session, { title: 'Hecha' })
    await createTask(app, session, { title: 'Pendiente' })
    await session.auth(request(app).patch(`/api/tasks/${done.id}`)).send({ completed: true })

    const res = await session.auth(request(app).delete('/api/tasks/completed'))
    expect(res.body.deleted).toBe(1)

    const rest = await list()
    expect(rest.body.tasks).toHaveLength(1)
    expect(rest.body.tasks[0].title).toBe('Pendiente')
  })
})

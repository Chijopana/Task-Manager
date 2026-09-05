import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import type { Express } from 'express'

import { createApp, type AppOptions } from '../src/app'
import { Task } from '../src/models/Task'
import { User } from '../src/models/User'

let mongoServer: MongoMemoryServer | undefined

export async function startTestDb(): Promise<void> {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  // Los mismos índices que en producción: si un test depende de un orden que
  // solo funciona sin índice, es mejor que se note aquí.
  await Promise.all([Task.syncIndexes(), User.syncIndexes()])
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect()
  await mongoServer?.stop()
}

export async function clearDb(): Promise<void> {
  await Promise.all([User.deleteMany({}), Task.deleteMany({})])
}

/** Por defecto sin límite de peticiones: la suite golpea la API mucho más que una persona. */
export function makeApp(options: AppOptions = {}): Express {
  return createApp({ rateLimit: { enabled: false }, ...options })
}

export interface TestSession {
  token: string
  userId: string
  username: string
  auth: <T extends { set: (k: string, v: string) => T }>(req: T) => T
}

export async function registerUser(
  app: Express,
  username = 'jose',
  password = 'secret1234',
): Promise<TestSession> {
  const res = await request(app).post('/api/users/register').send({ username, password })

  if (res.status !== 201) {
    throw new Error(`No se pudo registrar a ${username}: ${JSON.stringify(res.body)}`)
  }

  const token: string = res.body.token
  return {
    token,
    userId: res.body.user.id,
    username: res.body.user.username,
    auth: (req) => req.set('Authorization', `Bearer ${token}`),
  }
}

/** Crea una tarea y devuelve su cuerpo ya tipado como lo ve el cliente. */
export async function createTask(
  app: Express,
  session: TestSession,
  body: Record<string, unknown>,
) {
  const res = await session.auth(request(app).post('/api/tasks')).send(body)
  if (res.status !== 201) {
    throw new Error(`No se pudo crear la tarea: ${JSON.stringify(res.body)}`)
  }
  return res.body
}

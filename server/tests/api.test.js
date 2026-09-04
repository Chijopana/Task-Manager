// Environment has to be in place before anything requires config/env.
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-long-enough-to-pass-the-length-check-0123456789'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder'

const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const request = require('supertest')

const createApp = require('../app')
const User = require('../models/User')
const Task = require('../models/Task')

let mongoServer
let app

before(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  app = createApp()
})

after(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
  await Task.deleteMany({})
})

/** Registers a user and returns its auth token. */
async function registerUser(username = 'jose', password = 'secret123') {
  const res = await request(app)
    .post('/api/users/register')
    .send({ username, password })
  assert.equal(res.status, 201, `registro fallido: ${JSON.stringify(res.body)}`)
  return res.body.token
}

// --- Registro y login ------------------------------------------------------

test('registrarse devuelve un token para entrar directamente', async () => {
  const res = await request(app)
    .post('/api/users/register')
    .send({ username: 'jose', password: 'secret123' })

  assert.equal(res.status, 201)
  assert.ok(res.body.token, 'debería devolver un token')
  assert.equal(res.body.username, 'jose')
})

test('rechaza contraseñas de menos de 6 caracteres', async () => {
  const res = await request(app)
    .post('/api/users/register')
    .send({ username: 'jose', password: '123' })

  assert.equal(res.status, 400)
})

test('el usuario no distingue mayúsculas: "Jose" y "jose" son la misma cuenta', async () => {
  await registerUser('Jose', 'secret123')

  const res = await request(app)
    .post('/api/users/register')
    .send({ username: 'jose', password: 'secret123' })

  assert.equal(res.status, 409)
})

test('el login con contraseña incorrecta devuelve 401', async () => {
  await registerUser('jose', 'secret123')

  const res = await request(app)
    .post('/api/users/login')
    .send({ username: 'jose', password: 'incorrecta' })

  assert.equal(res.status, 401)
})

test('la respuesta del login nunca incluye el hash de la contraseña', async () => {
  await registerUser('jose', 'secret123')

  const res = await request(app)
    .post('/api/users/login')
    .send({ username: 'jose', password: 'secret123' })

  assert.equal(res.status, 200)
  assert.equal(res.body.password, undefined)
})

// --- Autenticación de las rutas de tareas ----------------------------------

test('las tareas exigen token', async () => {
  const res = await request(app).get('/api/tasks')
  assert.equal(res.status, 401)
})

test('un token con formato inválido se rechaza', async () => {
  const res = await request(app)
    .get('/api/tasks')
    .set('Authorization', 'Bearer no-es-un-token')

  assert.equal(res.status, 401)
  assert.equal(res.body.code, 'TOKEN_INVALID')
})

// --- CRUD de tareas --------------------------------------------------------

test('crear una tarea vacía devuelve 400', async () => {
  const token = await registerUser()

  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: '   ' })

  assert.equal(res.status, 400)
})

test('cada usuario solo ve sus propias tareas', async () => {
  const tokenA = await registerUser('usuarioa')
  const tokenB = await registerUser('usuariob')

  await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Tarea de A' })

  const res = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${tokenB}`)

  assert.equal(res.status, 200)
  assert.deepEqual(res.body, [])
})

test('no se puede reasignar una tarea a otro usuario (mass assignment)', async () => {
  const tokenA = await registerUser('usuarioa')
  const tokenB = await registerUser('usuariob')

  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Tarea de A' })

  const otherUser = await User.findOne({ username: 'usuariob' })

  // El campo `user` debe ignorarse aunque venga en el cuerpo.
  const res = await request(app)
    .put(`/api/tasks/${created.body._id}`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Secuestrada', user: otherUser._id.toString() })

  assert.equal(res.status, 200)

  const stillMine = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${tokenA}`)
  assert.equal(stillMine.body.length, 1, 'la tarea debe seguir siendo de A')

  const notStolen = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${tokenB}`)
  assert.deepEqual(notStolen.body, [], 'B no debería haber recibido nada')
})

test('editar la tarea de otro usuario devuelve 404, no 200', async () => {
  const tokenA = await registerUser('usuarioa')
  const tokenB = await registerUser('usuariob')

  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ title: 'Tarea de A' })

  const res = await request(app)
    .put(`/api/tasks/${created.body._id}`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ completed: true })

  assert.equal(res.status, 404)
})

test('borrar una tarea inexistente devuelve 404, no "Tarea eliminada"', async () => {
  const token = await registerUser()
  const ghostId = new mongoose.Types.ObjectId()

  const res = await request(app)
    .delete(`/api/tasks/${ghostId}`)
    .set('Authorization', `Bearer ${token}`)

  assert.equal(res.status, 404)
})

test('un id con formato inválido devuelve 400, no un error 500', async () => {
  const token = await registerUser()

  const res = await request(app)
    .delete('/api/tasks/no-es-un-id')
    .set('Authorization', `Bearer ${token}`)

  assert.equal(res.status, 400)
})

test('marcar una tarea como completada la actualiza', async () => {
  const token = await registerUser()

  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Comprar pan' })

  const res = await request(app)
    .put(`/api/tasks/${created.body._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ completed: true })

  assert.equal(res.status, 200)
  assert.equal(res.body.completed, true)
  assert.equal(res.body.title, 'Comprar pan')
})

test('una ruta que no existe devuelve 404 en JSON', async () => {
  const res = await request(app).get('/api/nope')
  assert.equal(res.status, 404)
  assert.ok(res.body.msg)
})

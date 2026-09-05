import type { RequestHandler } from 'express'
import { Types, type FilterQuery } from 'mongoose'
import {
  MAX_TASKS_PER_USER,
  addDaysISO,
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
  type SortField,
  type TaskList,
} from '@task-manager/shared'

import { conflict, notFound } from '../lib/httpError'
import { requireUser } from '../middleware/auth'
import { Task, toTaskDTO, type TaskDoc } from '../models/Task'

/** Neutraliza los metacaracteres para que una búsqueda no sea una expresión regular. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Las fechas se guardan como `YYYY-MM-DD`, así que el orden alfabético coincide
 * con el cronológico y se pueden comparar con `$lt` / `$gte` sin convertir nada.
 */
function buildFilter(
  userId: Types.ObjectId,
  query: ReturnType<typeof taskQuerySchema.parse>,
): FilterQuery<TaskDoc> {
  const filter: FilterQuery<TaskDoc> = { user: userId }

  if (query.status === 'pending') filter.completed = false
  if (query.status === 'completed') filter.completed = true

  if (query.priority) filter.priority = query.priority
  if (query.tag) filter.tags = query.tag
  if (query.search) filter.title = { $regex: escapeRegex(query.search), $options: 'i' }

  // El cliente manda su `today` porque el servidor no sabe en qué huso está.
  const today = query.today
  if (today) {
    if (query.due === 'overdue') {
      // Una tarea completada fuera de plazo ya no está «vencida».
      filter.dueDate = { $ne: null, $lt: today }
      filter.completed = false
    }
    if (query.due === 'today') filter.dueDate = today
    if (query.due === 'week') filter.dueDate = { $gte: today, $lte: addDaysISO(today, 7) }
  }
  if (query.due === 'none') filter.dueDate = null

  return filter
}

const SORT_SPECS: Record<SortField, (dir: 1 | -1) => Record<string, 1 | -1>> = {
  created: (dir) => ({ createdAt: dir, _id: dir }),
  // Las tareas sin fecha van siempre al final: ordenar por vencimiento y ver
  // primero lo que no vence no le sirve a nadie.
  due: (dir) => ({ _noDue: 1, dueDate: dir, createdAt: -1, _id: -1 }),
  priority: (dir) => ({ _rank: dir, createdAt: -1, _id: -1 }),
  title: (dir) => ({ title: dir, _id: dir }),
}

export const listTasks: RequestHandler = async (req, res) => {
  const { id } = requireUser(req)
  const userId = new Types.ObjectId(id)

  const query = taskQuerySchema.parse(req.query)
  const filter = buildFilter(userId, query)
  const dir: 1 | -1 = query.order === 'asc' ? 1 : -1

  const [docs, total, summary] = await Promise.all([
    Task.aggregate<TaskDoc>([
      { $match: filter },
      {
        $addFields: {
          _noDue: { $cond: [{ $eq: ['$dueDate', null] }, 1, 0] },
          // `priority` es texto, así que ordenar por él alfabéticamente daría
          // high < low < medium. Hace falta un rango explícito.
          _rank: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'high'] }, then: 0 },
                { case: { $eq: ['$priority', 'medium'] }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: SORT_SPECS[query.sort](dir) },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      { $unset: ['_noDue', '_rank'] },
    ]),
    Task.countDocuments(filter),
    summarize(userId, query.today),
  ])

  const payload: TaskList = {
    tasks: docs.map(toTaskDTO),
    page: query.page,
    limit: query.limit,
    total,
    hasMore: query.page * query.limit < total,
    ...summary,
  }

  res.json(payload)
}

/**
 * Contadores y vocabulario de etiquetas del conjunto completo, no solo de la
 * página devuelta: las pestañas deben decir cuántas tareas hay en total.
 */
async function summarize(
  userId: Types.ObjectId,
  today: string | undefined,
): Promise<Pick<TaskList, 'counts' | 'tags'>> {
  const [result] = await Task.aggregate<{
    status: { _id: boolean; count: number }[]
    overdue: { n: number }[]
    tags: { _id: string; count: number }[]
  }>([
    { $match: { user: userId } },
    {
      $facet: {
        status: [{ $group: { _id: '$completed', count: { $sum: 1 } } }],
        overdue: today
          ? [
              { $match: { completed: false, dueDate: { $ne: null, $lt: today } } },
              { $count: 'n' },
            ]
          // Sin `today` no se puede decidir qué está vencido: se responde 0 con un
          // filtro que no casa con nada (`_id` siempre existe).
          : [{ $match: { _id: null } }, { $count: 'n' }],
        tags: [
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 30 },
        ],
      },
    },
  ])

  const completed = result?.status.find((s) => s._id === true)?.count ?? 0
  const pending = result?.status.find((s) => s._id === false)?.count ?? 0

  return {
    counts: {
      all: completed + pending,
      pending,
      completed,
      overdue: result?.overdue[0]?.n ?? 0,
    },
    tags: (result?.tags ?? []).map((t) => ({ tag: t._id, count: t.count })),
  }
}

export const createTask: RequestHandler = async (req, res) => {
  const { id } = requireUser(req)
  const input = createTaskSchema.parse(req.body)

  // Registrarse es gratis, así que sin un tope por cuenta un solo token basta
  // para llenar la base de datos.
  const owned = await Task.countDocuments({ user: id })
  if (owned >= MAX_TASKS_PER_USER) {
    throw conflict(
      `Has alcanzado el límite de ${MAX_TASKS_PER_USER} tareas. Borra alguna para crear más.`,
      'TASK_LIMIT_REACHED',
    )
  }

  const task = await Task.create({ ...input, user: id })
  res.status(201).json(toTaskDTO(task))
}

export const updateTask: RequestHandler = async (req, res) => {
  const { id: userId } = requireUser(req)
  const changes = updateTaskSchema.parse(req.body)

  const update: Record<string, unknown> = { ...changes }

  // `completedAt` se deriva de `completed`; el cliente no lo manda ni puede.
  if (changes.completed === true) update.completedAt = new Date()
  if (changes.completed === false) update.completedAt = null

  // El filtro incluye el dueño: una tarea ajena no se encuentra, en vez de
  // encontrarse y comprobarse después.
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: userId },
    update,
    { new: true, runValidators: true },
  )

  if (!task) throw notFound('Tarea no encontrada', 'TASK_NOT_FOUND')

  res.json(toTaskDTO(task))
}

export const deleteTask: RequestHandler = async (req, res) => {
  const { id: userId } = requireUser(req)

  const task = await Task.findOneAndDelete({ _id: req.params.id, user: userId })
  if (!task) throw notFound('Tarea no encontrada', 'TASK_NOT_FOUND')

  res.json({ id: task._id.toString() })
}

/** Vaciar las completadas de una vez, en lugar de borrarlas una a una. */
export const clearCompleted: RequestHandler = async (req, res) => {
  const { id: userId } = requireUser(req)

  const { deletedCount } = await Task.deleteMany({ user: userId, completed: true })
  res.json({ deleted: deletedCount })
}

const Task = require('../models/Task')

/**
 * Only these fields may be changed through the API. Passing `req.body` straight
 * to the update let a client send `{ user: "<someone else's id>" }` and hand
 * their task to another account.
 */
const UPDATABLE_FIELDS = ['title', 'completed']

function pickUpdatableFields(body) {
  const update = {}

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) return { error: 'El título no puede estar vacío' }
    if (title.length > 200) {
      return { error: 'El título no puede superar los 200 caracteres' }
    }
    update.title = title
  }

  if (typeof body.completed === 'boolean') {
    update.completed = body.completed
  }

  if (Object.keys(update).length === 0) {
    return { error: `Nada que actualizar (campos válidos: ${UPDATABLE_FIELDS.join(', ')})` }
  }

  return { update }
}

exports.getTasks = async (req, res) => {
  const tasks = await Task.find({ user: req.user.id }).sort('-createdAt')
  res.json(tasks)
}

exports.createTask = async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : ''

  if (!title) return res.status(400).json({ msg: 'El título es obligatorio' })
  if (title.length > 200) {
    return res.status(400).json({ msg: 'El título no puede superar los 200 caracteres' })
  }

  const task = await Task.create({ title, user: req.user.id })
  res.status(201).json(task)
}

exports.updateTask = async (req, res) => {
  const { update, error } = pickUpdatableFields(req.body)
  if (error) return res.status(400).json({ msg: error })

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    update,
    { new: true, runValidators: true },
  )

  // Previously this returned 200 with `null` when the task didn't exist or
  // belonged to someone else.
  if (!task) return res.status(404).json({ msg: 'Tarea no encontrada' })

  res.json(task)
}

exports.deleteTask = async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  })

  if (!task) return res.status(404).json({ msg: 'Tarea no encontrada' })

  res.json({ msg: 'Tarea eliminada', id: task._id })
}

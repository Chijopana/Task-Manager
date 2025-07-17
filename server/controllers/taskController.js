const Task = require('../models/Task')

exports.getTasks = async (req, res) => {
  const tasks = await Task.find({ user: req.user.id }).sort('-createdAt')
  res.json(tasks)
}

exports.createTask = async (req, res) => {
  const { title } = req.body
  const newTask = new Task({ title, user: req.user.id })
  await newTask.save()
  res.status(201).json(newTask)
}

exports.deleteTask = async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id })
  res.json({ msg: 'Tarea eliminada' })
}

exports.updateTask = async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    req.body,
    { new: true }
  )
  res.json(task)
}

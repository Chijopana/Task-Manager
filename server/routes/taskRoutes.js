const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const { getTasks, createTask, deleteTask, updateTask } = require('../controllers/taskController')

router.get('/', auth, getTasks)
router.post('/', auth, createTask)
router.delete('/:id', auth, deleteTask)
router.put('/:id', auth, updateTask)

module.exports = router

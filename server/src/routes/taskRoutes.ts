import { Router } from 'express'

import {
  clearCompleted,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from '../controllers/taskController'
import { auth } from '../middleware/auth'

export function createTaskRouter(): Router {
  const router = Router()

  // Todas las rutas de tareas exigen sesión; no hay ninguna pública.
  router.use(auth)

  router.get('/', listTasks)
  router.post('/', createTask)
  router.delete('/completed', clearCompleted)
  router.patch('/:id', updateTask)
  router.delete('/:id', deleteTask)

  return router
}

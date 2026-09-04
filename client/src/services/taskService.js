import { api, errorMessage } from '../lib/api'

/**
 * Attaches a message the UI can show directly, so components don't have to dig
 * through the axios error shape.
 */
function withUserMessage(error, fallback) {
  error.userMessage = errorMessage(error, fallback)
  return error
}

export async function fetchTasks() {
  try {
    const { data } = await api.get('/api/tasks')
    return data
  } catch (err) {
    throw withUserMessage(err, 'No se pudieron cargar las tareas')
  }
}

export async function createTask(title) {
  try {
    const { data } = await api.post('/api/tasks', { title })
    return data
  } catch (err) {
    throw withUserMessage(err, 'No se pudo crear la tarea')
  }
}

export async function updateTask(id, changes) {
  try {
    const { data } = await api.put(`/api/tasks/${id}`, changes)
    return data
  } catch (err) {
    throw withUserMessage(err, 'No se pudo actualizar la tarea')
  }
}

export async function deleteTask(id) {
  try {
    await api.delete(`/api/tasks/${id}`)
  } catch (err) {
    throw withUserMessage(err, 'No se pudo eliminar la tarea')
  }
}

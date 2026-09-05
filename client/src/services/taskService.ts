import type { CreateTaskInput, Task, TaskList, UpdateTaskInput } from '@task-manager/shared'

import { api, ApiError } from '../lib/api'

export interface TaskFilters {
  status?: string
  due?: string
  tag?: string
  priority?: string
  search?: string
  sort?: string
  order?: string
  page?: number
  limit?: number
  today?: string
}

function toParams(filters: TaskFilters): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    // Los valores «cualquiera» son el defecto del servidor: no hace falta
    // mandarlos, y así la URL de la petición dice solo lo que se ha filtrado.
    if (value === undefined || value === '' || value === 'all' || value === 'any') continue
    params[key] = String(value)
  }
  return params
}

export async function fetchTasks(filters: TaskFilters): Promise<TaskList> {
  try {
    const { data } = await api.get('/api/tasks', { params: toParams(filters) })
    return data as TaskList
  } catch (err) {
    throw new ApiError(err, 'No se pudieron cargar las tareas')
  }
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  try {
    const { data } = await api.post('/api/tasks', input)
    return data as Task
  } catch (err) {
    throw new ApiError(err, 'No se pudo crear la tarea')
  }
}

export async function updateTask(id: string, changes: UpdateTaskInput): Promise<Task> {
  try {
    const { data } = await api.patch(`/api/tasks/${id}`, changes)
    return data as Task
  } catch (err) {
    throw new ApiError(err, 'No se pudo actualizar la tarea')
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await api.delete(`/api/tasks/${id}`)
  } catch (err) {
    throw new ApiError(err, 'No se pudo eliminar la tarea')
  }
}

export async function clearCompleted(): Promise<number> {
  try {
    const { data } = await api.delete('/api/tasks/completed')
    return typeof data?.deleted === 'number' ? data.deleted : 0
  } catch (err) {
    throw new ApiError(err, 'No se pudieron borrar las tareas completadas')
  }
}

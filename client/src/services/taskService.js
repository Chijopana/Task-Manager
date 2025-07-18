import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/tasks'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

export const fetchTasks = async () => {
  try {
    const res = await axios.get(API, {
      headers: getAuthHeaders()
    })
    return res.data
  } catch (err) {
    console.error('Error al obtener tareas:', err)
    throw err
  }
}

export const createTask = async (title) => {
  try {
    const res = await axios.post(API, { title }, {
      headers: getAuthHeaders()
    })
    return res.data
  } catch (err) {
    console.error('Error al crear tarea:', err)
    throw err
  }
}

export const deleteTask = async (id) => {
  try {
    await axios.delete(`${API}/${id}`, {
      headers: getAuthHeaders()
    })
  } catch (err) {
    console.error('Error al eliminar tarea:', err)
    throw err
  }
}

export const updateTask = async (id, data) => {
  try {
    const res = await axios.put(`${API}/${id}`, data, {
      headers: getAuthHeaders()
    })
    return res.data
  } catch (err) {
    console.error('Error al actualizar tarea:', err)
    throw err
  }
}

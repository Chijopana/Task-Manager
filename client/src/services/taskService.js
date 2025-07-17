import axios from 'axios'

const API = 'http://localhost:5000/api/tasks'

const getToken = () => localStorage.getItem('token')

export const fetchTasks = async () => {
  const res = await axios.get(API, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  })
  return res.data
}

export const createTask = async (title) => {
  const res = await axios.post(API, { title }, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  })
  return res.data
}

export const deleteTask = async (id) => {
  await axios.delete(`${API}/${id}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  })
}

export const updateTask = async (id, data) => {
  const res = await axios.put(`${API}/${id}`, data, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  })
  return res.data
}

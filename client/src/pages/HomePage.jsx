// src/pages/HomePage.jsx
import TaskManager from '../components/TaskManager'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import jwtDecode from 'jwt-decode'
import { LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HomePage() {
  const [username, setUsername] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        setUsername(decoded.username || 'Usuario')
      } catch {
        console.log('Token inválido')
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Toaster position="top-center" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-6xl bg-white p-10 rounded-xl shadow-lg space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">
            Bienvenido, <span className="text-blue-600">{username}</span>
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-800">Gestor de Tareas</h2>

        <TaskManager />
      </motion.div>
    </div>
  )
}

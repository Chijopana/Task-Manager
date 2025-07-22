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
  const storedUsername = localStorage.getItem('username')
  if (storedUsername) {
    setUsername(storedUsername)
  } else {
    setUsername('Usuario')
  }
}, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center px-4">
      <Toaster position="top-center" />
      <motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="w-full max-w-5xl bg-white p-8 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700"
>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
  <span className="inline-block bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-sm">
    👋
  </span>
  Bienvenido/a , <span className="text-blue-600">{username}</span>
</h1>
          <button
  onClick={handleLogout}
  className="flex items-center gap-2 text-sm px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition"
>
  <LogOut className="w-4 h-4" />
  Cerrar sesión
</button>
        </div>

        <h2 className="text-xl font-semibold text-center relative before:absolute before:bottom-0 before:left-1/2 before:-translate-x-1/2 before:w-16 before:h-1 before:bg-blue-500 before:rounded-full mb-6">
  Gestor de Tareas
</h2>

        <TaskManager />
      </motion.div>
    </div>
  )
}

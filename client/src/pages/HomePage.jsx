import TaskManager from '../components/TaskManager'
import ThemeToggle from "../components/ThemeToggle"
import { Toaster } from "react-hot-toast"
import * as jwtDecode from "jwt-decode"
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [username, setUsername] = useState("")

 useEffect(() => {
  const token = localStorage.getItem("token")
  if (token) {
    try {
      const decoded = jwtDecode(token)
      const userId = decoded.id

      fetch(`http://localhost:5000/api/users/${userId}`)
        .then(res => res.json())
        .then(data => setUsername(data.username || data.name))
        .catch(() => setUsername("Usuario"))

    } catch {
      console.log("Token inválido")
    }
  }
}, [])


  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-8 bg-gray-100 dark:bg-gray-900 font-sans">
      {/* Contenedor principal sin max-w-md */}
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 space-y-6">
        <Toaster position="top-center" />
        <div>
      <h1>Hola, {username || 'Usuario'}</h1>
      {/* El resto de tu HomePage */}
    </div>

        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
          Gestor de Tareas
        </h1>

        <TaskManager />
      </div>
    </div>
  )
}
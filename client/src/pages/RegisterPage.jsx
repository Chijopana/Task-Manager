// src/pages/RegisterPage.jsx
import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('http://localhost:5000/api/users/register', { username, password })
      alert('Registro exitoso')
      navigate('/login')
    } catch (error) {
      alert(error.response?.data?.msg || 'Error al registrarse')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-8 shadow-lg rounded-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
            <UserPlus className="w-6 h-6 text-blue-500" />
            Registro
          </h2>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir al login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition font-medium"
          >
            Registrarse
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// ✅ LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post('http://localhost:5000/api/users/login', { username, password })
      localStorage.setItem('token', res.data.token)
      navigate('/')
    } catch (error) {
      alert(error.response?.data?.msg || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-6">
          <LogIn className="text-blue-600 w-6 h-6" />
          <h2 className="text-2xl font-semibold">Iniciar Sesión</h2>
        </div>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
        >
          Entrar
        </button>

        <p className="mt-4 text-center text-sm">
          ¿No tienes cuenta?{' '}
          <span
            onClick={() => navigate('/register')}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Regístrate
          </span>
        </p>
      </form>
    </div>
  )
}

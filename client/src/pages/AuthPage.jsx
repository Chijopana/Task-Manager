import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { User, Lock } from "lucide-react"

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.878 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V7a4 4 0 00-8 0v4m12 0v4a4 4 0 01-8 0v-4m8-4h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-6a2 2 0 012-2z" />
  </svg>
)

export default function AuthPage() {
  const [mode, setMode] = useState('login') // or 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const url = `http://localhost:5000/api/users/${mode}`
    try {
      const res = await axios.post(url, { username, password })
      if (mode === 'login') {
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('username', res.data.username) // Guarda username también
        toast.success('Login exitoso! Redirigiendo...')
        setTimeout(() => navigate('/'), 1500)
      } else {
        toast.success('Registro exitoso! Ahora inicia sesión.')
        setMode('login')
      }
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error en la operación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 font-sans">
      <Toaster position="top-center" />
      <AnimatePresence mode="wait">
        <motion.form
          key={mode}
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}
          className="bg-white shadow-lg rounded-xl max-w-md w-full p-10 space-y-6 relative"
          aria-live="polite"
        >
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {mode === 'login' ? 'Iniciar Sesión' : 'Registro'}
          </h2>

          {/* Username input */}
          <label className="block relative">
            <span className="sr-only">Usuario</span>
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              autoComplete="username"
              disabled={loading}
            />
          </label>

          {/* Password input */}
          <label className="block relative">
            <span className="sr-only">Contraseña</span>
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={loading}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold shadow-md transition-colors
              ${mode === 'login' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              ${loading ? 'opacity-60 cursor-not-allowed' : ''}
            `}
            aria-busy={loading}
          >
            {loading ? (
              <svg
                className="animate-spin h-6 w-6 mx-auto text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            ) : mode === 'login' ? 'Entrar' : 'Registrarse'}
          </button>

          <p className="text-center text-sm text-gray-600 select-none">
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setUsername('')
                    setPassword('')
                    setMode('register')
                  }}
                  className="text-blue-600 hover:underline font-semibold"
                  disabled={loading}
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setUsername('')
                    setPassword('')
                    setMode('login')
                  }}
                  className="text-green-600 hover:underline font-semibold"
                  disabled={loading}
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </motion.form>
      </AnimatePresence>
    </div>
  )
}

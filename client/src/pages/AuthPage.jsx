import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { User, Lock, Eye, EyeOff, Loader2, CheckSquare } from 'lucide-react'
import { api, errorMessage } from '../lib/api'
import { saveSession } from '../lib/auth'
import { useTheme } from '../hooks/useTheme'
import ThemeToggle from '../components/ThemeToggle'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isDark, toggleTheme } = useTheme()
  const reduceMotion = useReducedMotion()

  const isLogin = mode === 'login'

  // The API interceptor redirects here with ?expired=1 when a session dies.
  useEffect(() => {
    if (searchParams.get('expired') !== '1') return
    toast('Tu sesión ha caducado, vuelve a entrar', { icon: '🔒' })
    searchParams.delete('expired')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const { data } = await api.post(`/api/users/${mode}`, {
        username: username.trim(),
        password,
      })

      // Registering now returns a token too, so there is no reason to send the
      // user back to type the same credentials again.
      saveSession(data)
      toast.success(isLogin ? 'Bienvenido de nuevo' : 'Cuenta creada')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo completar la operación'))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(isLogin ? 'register' : 'login')
    setPassword('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-on-accent">
            <CheckSquare className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-text">Gestor de tareas</h1>
          <p className="mt-1 text-muted">
            {isLogin
              ? 'Entra para ver tus tareas'
              : 'Crea una cuenta para empezar'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border bg-surface p-8 shadow-sm"
        >
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Usuario
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
                disabled={loading}
                placeholder="tu usuario"
                className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-text transition-colors placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-text"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                disabled={loading}
                placeholder="mínimo 6 caracteres"
                className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-11 text-text transition-colors placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-text"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLogin ? 'Entrar' : 'Crear cuenta'}
          </button>

          <p className="text-center text-sm text-muted">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
              className="font-semibold text-accent hover:underline"
            >
              {isLogin ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  )
}

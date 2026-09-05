import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckSquare, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN } from '@task-manager/shared/pure'

import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import * as authService from '../services/authService'

type Mode = 'login' | 'register'

const SESSION_NOTICES: Record<string, string> = {
  expired: 'Tu sesión ha caducado, vuelve a entrar',
  revoked: 'Se cerró la sesión en todos los dispositivos',
}

export default function AuthPage({ initialMode = 'login' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, signIn } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const isLogin = mode === 'login'

  // El interceptor de axios redirige aquí con ?motivo=... al morir una sesión.
  useEffect(() => {
    const motivo = searchParams.get('motivo')
    if (!motivo) return

    const notice = SESSION_NOTICES[motivo]
    if (notice) toast(notice, { icon: '🔒' })

    const next = new URLSearchParams(searchParams)
    next.delete('motivo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    try {
      const response = isLogin
        ? await authService.login(username.trim(), password)
        : await authService.register(username.trim(), password)

      // Registrarse devuelve token, así que no hay motivo para mandar al
      // usuario a teclear las mismas credenciales otra vez.
      signIn(response)
      toast.success(isLogin ? 'Bienvenido de nuevo' : 'Cuenta creada')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar la operación')
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
      <div className="absolute right-4 top-4">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      <div className="animate-rise w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-on-accent">
            <CheckSquare className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-text">Gestor de tareas</h1>
          <p className="mt-1 text-muted">
            {isLogin ? 'Entra para ver tus tareas' : 'Crea una cuenta para empezar'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border bg-surface p-8 shadow-sm"
        >
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-text">
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
                minLength={USERNAME_MIN}
                maxLength={USERNAME_MAX}
                autoComplete="username"
                disabled={loading}
                placeholder="tu usuario"
                className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-text transition-colors placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
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
                // Al entrar no se exige el mínimo: una cuenta creada con reglas
                // antiguas tiene que poder seguir accediendo.
                minLength={isLogin ? undefined : PASSWORD_MIN}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                disabled={loading}
                placeholder={isLogin ? 'tu contraseña' : `mínimo ${PASSWORD_MIN} caracteres`}
                className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-11 text-text transition-colors placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-text"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
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
      </div>
    </div>
  )
}

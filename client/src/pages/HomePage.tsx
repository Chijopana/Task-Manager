import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, ShieldOff } from 'lucide-react'

import { TaskManager } from '../components/TaskManager'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { logoutEverywhere } from '../services/authService'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [closingAll, setClosingAll] = useState(false)

  const handleLogout = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  /**
   * Un JWT sigue valiendo hasta que caduca aunque se borre del navegador. Esto
   * lo revoca en el servidor, que es lo que hace falta si el token ha podido
   * acabar en otro sitio.
   */
  const handleLogoutEverywhere = async () => {
    setClosingAll(true)
    try {
      await logoutEverywhere()
      signOut()
      toast.success('Sesión cerrada en todos los dispositivos')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión')
    } finally {
      setClosingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <main className="animate-rise mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">Hola de nuevo,</p>
            <h1 className="truncate text-2xl font-bold text-text">
              {user?.username ?? 'Usuario'}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => void handleLogoutEverywhere()}
              disabled={closingAll}
              title="Cerrar sesión en todos los dispositivos"
              aria-label="Cerrar sesión en todos los dispositivos"
              className="text-muted hover:text-danger"
            >
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-muted hover:border-danger/40 hover:text-danger"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </Button>
          </div>
        </header>

        <h2 className="mb-4 text-lg font-semibold text-text">Mis tareas</h2>
        <TaskManager />
      </main>
    </div>
  )
}

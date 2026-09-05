import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import TaskManager from '../components/TaskManager'
import ThemeToggle from '../components/ThemeToggle'
import { clearSession, getUsername } from '../lib/auth'
import { useTheme } from '../hooks/useTheme'

export default function HomePage() {
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const reduceMotion = useReducedMotion()
  const username = getUsername() || 'Usuario'

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
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

      <motion.main
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-3xl"
      >
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">Hola de nuevo,</p>
            <h1 className="truncate text-2xl font-bold text-text">{username}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </button>
          </div>
        </header>

        <h2 className="mb-4 text-lg font-semibold text-text">Mis tareas</h2>
        <TaskManager />
      </motion.main>
    </div>
  )
}

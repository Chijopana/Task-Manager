import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

import { AuthProvider } from './context/AuthProvider'
import { PrivateRoute } from './components/PrivateRoute'

// Cada pantalla en su propio fragmento: quien entra al login no descarga el
// gestor de tareas entero antes de poder escribir su usuario.
const HomePage = lazy(() => import('./pages/HomePage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Cargando" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <HomePage />
                </PrivateRoute>
              }
            />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage initialMode="register" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

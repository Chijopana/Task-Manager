import { useCallback, useEffect, useState } from 'react'

export const THEME_KEY = 'theme'

export type Theme = 'light' | 'dark'

/**
 * El script en línea de index.html ya aplicó la clase antes del primer pintado,
 * así que se lee del DOM en lugar de empezar en claro y corregir después.
 */
function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* almacenamiento bloqueado: el tema se aplica solo para esta visita */
    }
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  )

  return { theme, toggleTheme, isDark: theme === 'dark' }
}

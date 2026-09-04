import { useCallback, useEffect, useState } from 'react'

export const THEME_KEY = 'theme'

/**
 * The inline script in index.html already applied the class before paint, so we
 * read the DOM instead of defaulting to light and correcting it afterwards.
 */
function getInitialTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* storage disabled: the theme still applies for this visit */
    }
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  )

  return { theme, toggleTheme, isDark: theme === 'dark' }
}

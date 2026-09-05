import { Moon, Sun } from 'lucide-react'

/**
 * Theme state lives in useTheme so a single owner writes the class and the
 * stored preference; this is just the control.
 */
export default function ThemeToggle({ isDark, onToggle }) {
  const label = isDark ? 'Activar modo claro' : 'Activar modo oscuro'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-accent"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

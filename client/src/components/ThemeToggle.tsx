import { Moon, Sun } from 'lucide-react'

/**
 * El estado del tema vive en useTheme para que un único dueño escriba la clase
 * y la preferencia guardada; esto es solo el control.
 */
export function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const label = isDark ? 'Activar modo claro' : 'Activar modo oscuro'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-accent"
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  )
}

export default ThemeToggle

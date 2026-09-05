import { PRIORITY_LABELS } from '@task-manager/shared/pure'
import type { TaskPriority } from '@task-manager/shared'
import { cn } from '../../lib/cn'

const COLORS: Record<TaskPriority, string> = {
  high: 'bg-danger',
  medium: 'bg-warning',
  low: 'bg-border-strong',
}

/**
 * La prioridad se marca con un punto en lugar de una etiqueta de texto: en una
 * lista larga, tres puntos de color se comparan de un vistazo y no roban ancho
 * al título, que es lo que de verdad se lee.
 */
export function PriorityDot({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn('h-2 w-2 shrink-0 rounded-full', COLORS[priority])}
      title={`Prioridad ${PRIORITY_LABELS[priority].toLowerCase()}`}
      aria-label={`Prioridad ${PRIORITY_LABELS[priority].toLowerCase()}`}
      role="img"
    />
  )
}

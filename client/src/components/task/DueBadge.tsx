import { CalendarClock } from 'lucide-react'
import { dueState, formatDueDate, formatDueDateLong } from '@task-manager/shared/pure'
import { cn } from '../../lib/cn'

const STYLES: Record<string, string> = {
  overdue: 'text-danger',
  today: 'text-warning',
  soon: 'text-muted',
  later: 'text-faint',
}

/**
 * Una fecha suelta («2026-06-15») obliga a calcular mentalmente si queda lejos.
 * «ayer» o «en 3 días» se lee de un vistazo, y el color dice si urge.
 */
export function DueBadge({
  dueDate,
  today,
  completed,
}: {
  dueDate: string
  today: string
  completed: boolean
}) {
  const state = completed ? 'later' : dueState(dueDate, today)
  const label = formatDueDate(dueDate, today)

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs font-medium',
        STYLES[state] ?? 'text-muted',
      )}
      title={formatDueDateLong(dueDate)}
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
      {state === 'overdue' && !completed ? `Venció ${label}` : label}
    </span>
  )
}

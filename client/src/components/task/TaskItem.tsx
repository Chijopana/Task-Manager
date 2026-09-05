import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Circle, CircleCheckBig, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { TITLE_MAX } from '@task-manager/shared/pure'
import type { Task } from '@task-manager/shared'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { cn } from '../../lib/cn'
import { DueBadge } from './DueBadge'
import { PriorityDot } from './PriorityDot'
import { TagChip } from './TagChip'

interface TaskItemProps {
  task: Task
  today: string
  busy: boolean
  activeTag: string
  onToggle: (task: Task) => void
  onRename: (id: string, title: string) => void
  onDelete: (task: Task) => void
  onSelectTag: (tag: string) => void
}

export function TaskItem({
  task,
  today,
  busy,
  activeTag,
  onToggle,
  onRename,
  onDelete,
  onSelectTag,
}: TaskItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const startEditing = () => {
    setDraft(task.title)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(task.title)
  }

  const save = () => {
    const title = draft.trim()
    if (!title) return cancel()
    // Guardar sin haber cambiado nada sería una petición para nada.
    if (title !== task.title) onRename(task.id, title)
    setEditing(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      save()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 transition-colors',
        busy && 'opacity-70',
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        disabled={busy}
        aria-pressed={task.completed}
        aria-label={
          task.completed
            ? `Marcar "${task.title}" como pendiente`
            : `Marcar "${task.title}" como completada`
        }
        className="mt-0.5 shrink-0 disabled:opacity-50"
      >
        {task.completed ? (
          <CircleCheckBig className="h-5 w-5 text-success" aria-hidden="true" />
        ) : (
          <Circle className="h-5 w-5 text-faint transition-colors hover:text-accent" aria-hidden="true" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {editing ? (
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            // Salir con un clic fuera cancela en vez de guardar: guardar en
            // blur era lo que antes disparaba un PUT después de cancelar.
            onBlur={cancel}
            maxLength={TITLE_MAX}
            aria-label="Editar el título de la tarea"
            className="h-8 text-sm"
          />
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <PriorityDot priority={task.priority} />
            <span
              className={cn(
                'min-w-0 truncate text-sm',
                task.completed ? 'text-faint line-through' : 'text-text',
              )}
              title={task.title}
            >
              {task.title}
            </span>
          </div>
        )}

        {!editing && (task.dueDate || task.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-4">
            {task.dueDate && (
              <DueBadge dueDate={task.dueDate} today={today} completed={task.completed} />
            )}
            {task.tags.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                active={tag === activeTag}
                onClick={() => onSelectTag(tag)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              // `onMouseDown` en vez de `onClick`: el blur del input llegaría
              // antes que el clic y cancelaría la edición sin guardar.
              onMouseDown={(e) => {
                e.preventDefault()
                save()
              }}
              aria-label="Guardar cambios"
            >
              <Check className="h-4 w-4 text-success" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={cancel} aria-label="Cancelar edición">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={startEditing}
              disabled={busy}
              aria-label={`Editar "${task.title}"`}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="danger"
              size="icon-sm"
              onClick={() => onDelete(task)}
              disabled={busy}
              aria-label={`Eliminar "${task.title}"`}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

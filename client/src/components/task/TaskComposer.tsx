import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CalendarPlus, Loader2, Plus, Tag, X } from 'lucide-react'
import {
  MAX_TAGS_PER_TASK,
  PRIORITIES,
  PRIORITY_LABELS,
  TITLE_MAX,
  normalizeTag,
} from '@task-manager/shared/pure'
import type { CreateTaskInput, TaskPriority } from '@task-manager/shared'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { TagChip } from './TagChip'

interface TaskComposerProps {
  onCreate: (input: CreateTaskInput) => Promise<boolean>
  today: string
}

/**
 * Los campos opcionales están plegados por defecto.
 *
 * La acción habitual es escribir un título y pulsar Enter; poner fecha,
 * prioridad y etiquetas siempre a la vista convertiría cada tarea rápida en un
 * formulario que rellenar.
 */
export function TaskComposer({ onCreate, today }: TaskComposerProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)

  const addTag = () => {
    const tag = normalizeTag(tagDraft)
    setTagDraft('')
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS_PER_TASK) return
    setTags((current) => [...current, tag])
  }

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter y coma cierran la etiqueta; Retroceso en vacío borra la anterior.
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag()
    } else if (event.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      setTags((current) => current.slice(0, -1))
    }
  }

  const reset = () => {
    setTitle('')
    setDueDate('')
    setPriority('medium')
    setTags([])
    setTagDraft('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || saving) return

    setSaving(true)
    const ok = await onCreate({
      title: trimmed,
      dueDate: dueDate || null,
      priority,
      tags,
    })
    setSaving(false)

    if (ok) {
      reset()
      titleRef.current?.focus()
    }
  }

  const detailsId = 'composer-details'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué hay que hacer?"
          maxLength={TITLE_MAX}
          aria-label="Título de la tarea nueva"
          disabled={saving}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={expanded ? 'Ocultar fecha y etiquetas' : 'Añadir fecha, prioridad o etiquetas'}
          title="Fecha, prioridad y etiquetas"
          className="h-10 w-10 shrink-0"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="submit" disabled={saving || title.trim() === ''} className="shrink-0">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Añadir
        </Button>
      </div>

      {expanded && (
        <div
          id={detailsId}
          className="grid gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:grid-cols-[auto_auto_1fr]"
        >
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="shrink-0">Vence</span>
            <Input
              type="date"
              value={dueDate}
              min={today}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 w-auto"
              aria-label="Fecha de vencimiento"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="shrink-0">Prioridad</span>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Prioridad"
            >
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </Select>
          </label>

          <div className="flex min-w-0 flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder={
                  tags.length >= MAX_TAGS_PER_TASK ? 'Máximo alcanzado' : 'Etiqueta y Enter'
                }
                disabled={tags.length >= MAX_TAGS_PER_TASK}
                className="h-9"
                aria-label="Añadir etiqueta"
              />
            </label>

            {tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag}>
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-muted">
                      <TagChip tag={tag} />
                      <button
                        type="button"
                        onClick={() => setTags((c) => c.filter((t) => t !== tag))}
                        aria-label={`Quitar la etiqueta ${tag}`}
                        className="text-faint transition-colors hover:text-danger"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </form>
  )
}

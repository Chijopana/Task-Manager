import { ArrowDownNarrowWide, ArrowUpNarrowWide, RotateCcw, Search, X } from 'lucide-react'
import { PRIORITIES, PRIORITY_LABELS } from '@task-manager/shared/pure'
import type { DueFilter, SortField, StatusFilter, TaskList } from '@task-manager/shared'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { cn } from '../../lib/cn'
import { TagChip } from './TagChip'
import type { Filters } from '../../hooks/useTasks'

const STATUS_TABS: { id: StatusFilter; label: string; countKey: keyof TaskList['counts'] }[] = [
  { id: 'all', label: 'Todas', countKey: 'all' },
  { id: 'pending', label: 'Pendientes', countKey: 'pending' },
  { id: 'completed', label: 'Completadas', countKey: 'completed' },
]

const DUE_CHIPS: { id: DueFilter; label: string }[] = [
  { id: 'any', label: 'Cualquier fecha' },
  { id: 'overdue', label: 'Vencidas' },
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'none', label: 'Sin fecha' },
]

const SORT_OPTIONS: { id: SortField; label: string }[] = [
  { id: 'created', label: 'Creación' },
  { id: 'due', label: 'Vencimiento' },
  { id: 'priority', label: 'Prioridad' },
  { id: 'title', label: 'Título' },
]

interface TaskFiltersProps {
  filters: Filters
  counts: TaskList['counts']
  tags: TaskList['tags']
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
  isFiltered: boolean
}

export function TaskFilters({
  filters,
  counts,
  tags,
  onChange,
  onReset,
  isFiltered,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Estado: es el filtro que más se usa, así que va aparte y más grande. */}
      <div role="tablist" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {STATUS_TABS.map(({ id, label, countKey }) => {
          const active = filters.status === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange({ status: id })}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                active ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted hover:text-text',
              )}
            >
              {label}
              <span className={cn('ml-1.5 tabular-nums', active ? 'opacity-80' : 'text-faint')}>
                {counts[countKey]}
              </span>
            </button>
          )
        })}

        {counts.overdue > 0 && (
          <button
            type="button"
            onClick={() =>
              onChange({ due: filters.due === 'overdue' ? 'any' : 'overdue', status: 'pending' })
            }
            aria-pressed={filters.due === 'overdue'}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
              filters.due === 'overdue'
                ? 'bg-danger text-on-accent'
                : 'bg-danger/10 text-danger hover:bg-danger/20',
            )}
          >
            Vencidas
            <span className="ml-1.5 tabular-nums opacity-80">{counts.overdue}</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Buscar"
            aria-label="Buscar por título"
            className="h-9 pl-8"
          />
        </div>

        <Select
          value={filters.due}
          onChange={(e) => onChange({ due: e.target.value as DueFilter })}
          aria-label="Filtrar por vencimiento"
        >
          {DUE_CHIPS.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={filters.priority}
          onChange={(e) => onChange({ priority: e.target.value })}
          aria-label="Filtrar por prioridad"
        >
          <option value="">Cualquier prioridad</option>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-1">
          <Select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as SortField })}
            aria-label="Ordenar por"
          >
            {SORT_OPTIONS.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
            aria-label={
              filters.order === 'asc' ? 'Orden ascendente, cambiar a descendente' : 'Orden descendente, cambiar a ascendente'
            }
            title={filters.order === 'asc' ? 'Ascendente' : 'Descendente'}
          >
            {filters.order === 'asc' ? (
              <ArrowUpNarrowWide className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowDownNarrowWide className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Limpiar
          </Button>
        )}
      </div>

      {/* El vocabulario de etiquetas lo calcula el servidor sobre todas las
          tareas, no solo sobre la página que se está viendo. */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map(({ tag, count }) => (
            <TagChip
              key={tag}
              tag={tag}
              count={count}
              active={filters.tag === tag}
              onClick={() => onChange({ tag: filters.tag === tag ? '' : tag })}
            />
          ))}
          {filters.tag && (
            <button
              type="button"
              onClick={() => onChange({ tag: '' })}
              className="inline-flex items-center gap-1 text-xs text-faint transition-colors hover:text-danger"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Quitar etiqueta
            </button>
          )}
        </div>
      )}
    </div>
  )
}

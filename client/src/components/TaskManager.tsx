import { useCallback, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  ClipboardList,
  Loader2,
  RotateCw,
  SearchX,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import type { Task } from '@task-manager/shared'

import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { TaskComposer } from './task/TaskComposer'
import { TaskFilters } from './task/TaskFilters'
import { TaskItem } from './task/TaskItem'
import { DEFAULT_FILTERS, useTasks } from '../hooks/useTasks'

export function TaskManager() {
  const notify = useCallback((kind: 'error' | 'success', msg: string) => {
    if (kind === 'error') toast.error(msg)
    else toast.success(msg)
  }, [])

  const tm = useTasks(notify)
  const reduceMotion = useReducedMotion()

  const percent = tm.counts.all === 0 ? 0 : (tm.counts.completed / tm.counts.all) * 100
  const motionPercent = useMotionValue(percent)
  const spring = useSpring(motionPercent, { stiffness: 120, damping: 22 })
  const width = useTransform(spring, (v) => `${v}%`)
  const rounded = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    motionPercent.set(percent)
  }, [percent, motionPercent])

  const isFiltered = useMemo(
    () =>
      (Object.keys(DEFAULT_FILTERS) as (keyof typeof DEFAULT_FILTERS)[]).some(
        (key) => tm.filters[key] !== DEFAULT_FILTERS[key],
      ),
    [tm.filters],
  )

  /**
   * Borrar ofrece deshacer en el propio aviso en lugar de pedir confirmación
   * antes: para algo tan pequeño, un modal molesta más de lo que protege.
   */
  const handleDelete = useCallback(
    async (task: Task) => {
      const ok = await tm.removeTask(task)
      if (!ok) return

      toast(
        (t) => (
          <span className="flex items-center gap-3">
            <span className="truncate">Tarea eliminada</span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id)
                void tm.restoreTask(task)
              }}
              className="shrink-0 font-semibold text-accent hover:underline"
            >
              Deshacer
            </button>
          </span>
        ),
        { duration: 6000, icon: <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" /> },
      )
    },
    [tm],
  )

  const handleClearCompleted = useCallback(async () => {
    const deleted = await tm.clearCompleted()
    if (deleted > 0) {
      toast.success(deleted === 1 ? 'Tarea completada borrada' : `${deleted} tareas borradas`)
    }
  }, [tm])

  return (
    <Card className="w-full space-y-6">
      <TaskComposer onCreate={tm.addTask} today={tm.today} />

      {tm.counts.all > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <p className="text-muted">
              <motion.span className="font-semibold text-text">{rounded}</motion.span>
              <span className="font-semibold text-text">%</span> completado
              <span className="ml-1 tabular-nums">
                ({tm.counts.completed}/{tm.counts.all})
              </span>
            </p>
            {tm.counts.completed > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearCompleted}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Vaciar completadas
              </Button>
            )}
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de tareas"
          >
            <motion.div
              className="h-full bg-accent"
              style={{ width: reduceMotion ? `${percent}%` : width }}
            />
          </div>
        </div>
      )}

      <TaskFilters
        filters={tm.filters}
        counts={tm.counts}
        tags={tm.tags}
        onChange={tm.setFilters}
        onReset={tm.resetFilters}
        isFiltered={isFiltered}
      />

      <div aria-busy={tm.loading}>
        {tm.loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted">
            <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
            <p aria-live="polite">
              {/* El plan gratuito duerme el servicio: sin esto son treinta
                  segundos de rueda girando sin ninguna explicación. */}
              {tm.slow
                ? 'El servidor estaba dormido y está despertando. Puede tardar hasta 30 segundos.'
                : 'Cargando tareas...'}
            </p>
          </div>
        ) : tm.error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 py-10 text-center"
          >
            <AlertCircle className="h-7 w-7 text-danger" aria-hidden="true" />
            <div>
              <p className="font-semibold text-text">{tm.error}</p>
              <p className="mt-1 text-sm text-muted">
                Comprueba tu conexión e inténtalo de nuevo.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={tm.reload}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : tm.tasks.length === 0 ? (
          <EmptyState
            filtered={isFiltered}
            allDone={tm.counts.all > 0 && tm.counts.pending === 0}
            onReset={tm.resetFilters}
          />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {tm.tasks.map((task) => (
                  <motion.li
                    key={task.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, x: 12 }}
                    transition={{ duration: 0.16 }}
                  >
                    <TaskItem
                      task={task}
                      today={tm.today}
                      busy={tm.busyIds.has(task.id)}
                      activeTag={tm.filters.tag}
                      onToggle={(t) => void tm.toggleTask(t)}
                      onRename={(id, title) => void tm.editTask(id, { title })}
                      onDelete={(t) => void handleDelete(t)}
                      onSelectTag={(tag) =>
                        tm.setFilters({ tag: tm.filters.tag === tag ? '' : tag })
                      }
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {tm.hasMore && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <Button variant="outline" size="sm" onClick={tm.loadMore} disabled={tm.loadingMore}>
                  {tm.loadingMore && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  )}
                  Cargar más
                </Button>
                <p className="text-xs text-faint tabular-nums">
                  {tm.tasks.length} de {tm.total}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

function EmptyState({
  filtered,
  allDone,
  onReset,
}: {
  filtered: boolean
  allDone: boolean
  onReset: () => void
}) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <SearchX className="h-10 w-10 text-border-strong" aria-hidden="true" />
        <p className="font-semibold text-text">Ninguna tarea coincide con el filtro</p>
        <p className="text-sm text-muted">Prueba a quitar alguna condición.</p>
        <Button variant="outline" size="sm" onClick={onReset} className="mt-2">
          Limpiar filtros
        </Button>
      </div>
    )
  }

  if (allDone) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Sparkles className="h-10 w-10 text-success" aria-hidden="true" />
        <p className="font-semibold text-text">Todo hecho</p>
        <p className="text-sm text-muted">No queda nada pendiente.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <ClipboardList className="h-10 w-10 text-border-strong" aria-hidden="true" />
      <p className="font-semibold text-text">No tienes tareas aún</p>
      <p className="text-sm text-muted">Escribe una arriba para empezar.</p>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_PAGE_SIZE, todayISO } from '@task-manager/shared/pure'
import type {
  CreateTaskInput,
  DueFilter,
  SortField,
  StatusFilter,
  Task,
  TaskList,
  UpdateTaskInput,
} from '@task-manager/shared'

import * as taskService from '../services/taskService'

export interface Filters {
  status: StatusFilter
  due: DueFilter
  tag: string
  priority: string
  search: string
  sort: SortField
  order: 'asc' | 'desc'
}

export const DEFAULT_FILTERS: Filters = {
  status: 'all',
  due: 'any',
  tag: '',
  priority: '',
  search: '',
  sort: 'created',
  order: 'desc',
}

type Counts = TaskList['counts']

const EMPTY_COUNTS: Counts = { all: 0, pending: 0, completed: 0, overdue: 0 }

/** Milisegundos antes de admitir que el servidor está tardando de más. */
const SLOW_AFTER_MS = 3_000

/** Decide si una tarea sigue perteneciendo a la vista actual tras editarla. */
function matchesFilters(task: Task, filters: Filters, today: string): boolean {
  if (filters.status === 'pending' && task.completed) return false
  if (filters.status === 'completed' && !task.completed) return false
  if (filters.priority && task.priority !== filters.priority) return false
  if (filters.tag && !task.tags.includes(filters.tag)) return false
  if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
    return false
  }

  if (filters.due === 'none') return task.dueDate === null
  if (filters.due === 'overdue') {
    return task.dueDate !== null && task.dueDate < today && !task.completed
  }
  if (filters.due === 'today') return task.dueDate === today
  if (filters.due === 'week') {
    return task.dueDate !== null && task.dueDate >= today
  }

  return true
}

/** Ajuste local de los contadores tras un cambio de estado, sin volver a preguntar. */
function applyCountDelta(counts: Counts, before: Task, after: Task, today: string): Counts {
  const wasOverdue = !before.completed && before.dueDate !== null && before.dueDate < today
  const isOverdue = !after.completed && after.dueDate !== null && after.dueDate < today
  const doneDelta = Number(after.completed) - Number(before.completed)

  return {
    all: counts.all,
    completed: counts.completed + doneDelta,
    pending: counts.pending - doneDelta,
    overdue: counts.overdue + (Number(isOverdue) - Number(wasOverdue)),
  }
}

export interface UseTasksResult {
  tasks: Task[]
  counts: Counts
  tags: TaskList['tags']
  total: number
  hasMore: boolean
  loading: boolean
  /** El servicio gratuito duerme: a los 3 s conviene decir por qué se espera. */
  slow: boolean
  loadingMore: boolean
  error: string | null
  busyIds: ReadonlySet<string>
  filters: Filters
  today: string
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
  reload: () => void
  loadMore: () => void
  addTask: (input: CreateTaskInput) => Promise<boolean>
  editTask: (id: string, changes: UpdateTaskInput) => Promise<boolean>
  toggleTask: (task: Task) => Promise<boolean>
  removeTask: (task: Task) => Promise<boolean>
  restoreTask: (task: Task) => Promise<boolean>
  clearCompleted: () => Promise<number>
}

export function useTasks(notify: (kind: 'error' | 'success', msg: string) => void): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([])
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [tags, setTags] = useState<TaskList['tags']>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set())

  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS)

  // El día del usuario, no el del servidor: «vence hoy» solo tiene sentido
  // contra el calendario de quien mira la pantalla.
  const today = todayISO()

  // Descarta respuestas de peticiones que ya no corresponden al filtro actual.
  const requestId = useRef(0)

  const markBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const load = useCallback(
    async (targetPage: number, mode: 'replace' | 'append') => {
      const id = ++requestId.current

      if (mode === 'replace') setLoading(true)
      else setLoadingMore(true)
      setError(null)

      const slowTimer = setTimeout(() => {
        if (requestId.current === id) setSlow(true)
      }, SLOW_AFTER_MS)

      try {
        const data = await taskService.fetchTasks({
          ...filters,
          today,
          page: targetPage,
          limit: DEFAULT_PAGE_SIZE,
        })

        if (requestId.current !== id) return

        setTasks((current) => (mode === 'append' ? [...current, ...data.tasks] : data.tasks))
        setCounts(data.counts)
        setTags(data.tags)
        setTotal(data.total)
        setHasMore(data.hasMore)
        setPage(data.page)
      } catch (err) {
        if (requestId.current !== id) return
        // Un 401 ya lo gestiona el interceptor: aquí solo llegan fallos reales.
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las tareas')
      } finally {
        clearTimeout(slowTimer)
        if (requestId.current === id) {
          setLoading(false)
          setLoadingMore(false)
          setSlow(false)
        }
      }
    },
    [filters, today],
  )

  useEffect(() => {
    void load(1, 'replace')
  }, [load])

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((current) => ({ ...current, ...patch }))
  }, [])

  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), [])
  const reload = useCallback(() => void load(1, 'replace'), [load])
  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) void load(page + 1, 'append')
  }, [hasMore, loadingMore, load, page])

  /**
   * Alta optimista: la tarea aparece con un id provisional y se sustituye por
   * la real cuando responde el servidor. Si falla, se retira y se avisa.
   */
  const addTask = useCallback(
    async (input: CreateTaskInput): Promise<boolean> => {
      const tempId = `temp-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimistic: Task = {
        id: tempId,
        title: input.title,
        completed: false,
        dueDate: input.dueDate ?? null,
        priority: input.priority ?? 'medium',
        tags: input.tags ?? [],
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      }

      setTasks((current) => [optimistic, ...current])
      setCounts((c) => ({
        ...c,
        all: c.all + 1,
        pending: c.pending + 1,
        overdue:
          optimistic.dueDate !== null && optimistic.dueDate < today ? c.overdue + 1 : c.overdue,
      }))
      setTotal((t) => t + 1)
      markBusy(tempId, true)

      try {
        const created = await taskService.createTask(input)
        setTasks((current) => current.map((t) => (t.id === tempId ? created : t)))
        // Las etiquetas nuevas cambian el vocabulario del filtro, que solo
        // conoce el servidor: merece una resincronización silenciosa.
        if (created.tags.length > 0) void load(1, 'replace')
        return true
      } catch (err) {
        setTasks((current) => current.filter((t) => t.id !== tempId))
        setCounts((c) => ({ ...c, all: c.all - 1, pending: c.pending - 1 }))
        setTotal((t) => t - 1)
        notify('error', err instanceof Error ? err.message : 'No se pudo crear la tarea')
        return false
      } finally {
        markBusy(tempId, false)
      }
    },
    [markBusy, notify, today, load],
  )

  /**
   * Edición optimista con reversión.
   *
   * Antes cada clic esperaba la respuesta del servidor: en el plan gratuito de
   * Render, con el servicio dormido, eso son treinta segundos de casilla
   * bloqueada para marcar una tarea como hecha.
   */
  const applyOptimistic = useCallback(
    async (task: Task, changes: UpdateTaskInput, fallbackMsg: string): Promise<boolean> => {
      const previous = task
      const optimistic: Task = {
        ...task,
        ...changes,
        tags: changes.tags ?? task.tags,
        completedAt:
          changes.completed === undefined
            ? task.completedAt
            : changes.completed
              ? new Date().toISOString()
              : null,
      }

      setTasks((current) =>
        current
          .map((t) => (t.id === task.id ? optimistic : t))
          // Al completar una tarea estando en «Pendientes», debe salir de la lista.
          .filter((t) => t.id !== task.id || matchesFilters(optimistic, filters, today)),
      )
      setCounts((c) => applyCountDelta(c, previous, optimistic, today))
      markBusy(task.id, true)

      try {
        const saved = await taskService.updateTask(task.id, changes)
        setTasks((current) => current.map((t) => (t.id === saved.id ? saved : t)))
        return true
      } catch (err) {
        // Reversión: se devuelve la tarea a su sitio y se restauran los contadores.
        setTasks((current) => {
          const withoutIt = current.filter((t) => t.id !== previous.id)
          return withoutIt.length === current.length
            ? [previous, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            : current.map((t) => (t.id === previous.id ? previous : t))
        })
        setCounts((c) => applyCountDelta(c, optimistic, previous, today))
        notify('error', err instanceof Error ? err.message : fallbackMsg)
        return false
      } finally {
        markBusy(task.id, false)
      }
    },
    [filters, today, markBusy, notify],
  )

  const editTask = useCallback(
    async (id: string, changes: UpdateTaskInput): Promise<boolean> => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return false

      const ok = await applyOptimistic(task, changes, 'No se pudo actualizar la tarea')
      // Cambiar etiquetas altera el vocabulario del filtro; conviene resincronizar.
      if (ok && changes.tags) void load(1, 'replace')
      return ok
    },
    [tasks, applyOptimistic, load],
  )

  const toggleTask = useCallback(
    (task: Task) =>
      applyOptimistic(task, { completed: !task.completed }, 'No se pudo actualizar la tarea'),
    [applyOptimistic],
  )

  const removeTask = useCallback(
    async (task: Task): Promise<boolean> => {
      const previous = tasks
      setTasks((current) => current.filter((t) => t.id !== task.id))
      setCounts((c) => ({
        all: c.all - 1,
        completed: c.completed - Number(task.completed),
        pending: c.pending - Number(!task.completed),
        overdue:
          !task.completed && task.dueDate !== null && task.dueDate < today
            ? c.overdue - 1
            : c.overdue,
      }))
      setTotal((t) => t - 1)

      try {
        await taskService.deleteTask(task.id)
        return true
      } catch (err) {
        setTasks(previous)
        void load(1, 'replace')
        notify('error', err instanceof Error ? err.message : 'No se pudo eliminar la tarea')
        return false
      }
    },
    [tasks, today, notify, load],
  )

  /**
   * Deshacer un borrado.
   *
   * La tarea se recrea con los mismos datos en lugar de aplazar el borrado
   * real: así los contadores del servidor y lo que se ve en pantalla nunca
   * discrepan, a cambio de que la tarea recuperada tenga un identificador
   * nuevo. Si estaba completada, vuelve completada.
   */
  const restoreTask = useCallback(
    async (task: Task): Promise<boolean> => {
      try {
        const created = await taskService.createTask({
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
          tags: task.tags,
        })

        const restored = task.completed
          ? await taskService.updateTask(created.id, { completed: true })
          : created

        setTasks((current) =>
          matchesFilters(restored, filters, today) ? [restored, ...current] : current,
        )
        setCounts((c) => ({
          all: c.all + 1,
          completed: c.completed + Number(restored.completed),
          pending: c.pending + Number(!restored.completed),
          overdue:
            !restored.completed && restored.dueDate !== null && restored.dueDate < today
              ? c.overdue + 1
              : c.overdue,
        }))
        setTotal((t) => t + 1)
        return true
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'No se pudo recuperar la tarea')
        return false
      }
    },
    [filters, today, notify],
  )

  const clearCompleted = useCallback(async (): Promise<number> => {
    const previous = tasks
    const previousCounts = counts

    setTasks((current) => current.filter((t) => !t.completed))
    setCounts((c) => ({ ...c, all: c.pending, completed: 0 }))

    try {
      const deleted = await taskService.clearCompleted()
      void load(1, 'replace')
      return deleted
    } catch (err) {
      setTasks(previous)
      setCounts(previousCounts)
      notify('error', err instanceof Error ? err.message : 'No se pudieron borrar')
      return 0
    }
  }, [tasks, counts, notify, load])

  return {
    tasks,
    counts,
    tags,
    total,
    hasMore,
    loading,
    slow,
    loadingMore,
    error,
    busyIds,
    filters,
    today,
    setFilters,
    resetFilters,
    reload,
    loadMore,
    addTask,
    editTask,
    toggleTask,
    removeTask,
    restoreTask,
    clearCompleted,
  }
}

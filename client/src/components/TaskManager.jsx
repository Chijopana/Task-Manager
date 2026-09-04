import { useCallback, useEffect, useState } from "react"
import {
  fetchTasks,
  createTask,
  deleteTask,
  updateTask,
} from "../services/taskService"
import {
  Trash2,
  Edit2,
  Check,
  X,
  ClipboardList,
  CircleCheckBig,
  Circle,
  Loader2,
  AlertCircle,
  RotateCw,
  Plus,
} from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import toast from "react-hot-toast"
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion"

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendientes" },
  { id: "completed", label: "Completadas" },
]

const EMPTY_STATE = {
  all: {
    title: "No tienes tareas aún",
    hint: "Escribe una arriba para empezar.",
  },
  pending: {
    title: "No hay tareas pendientes",
    hint: "Todo hecho, buen trabajo.",
  },
  completed: {
    title: "Todavía no has completado ninguna",
    hint: "Marca el círculo de una tarea para completarla.",
  },
}

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState("")
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingText, setEditingText] = useState("")
  const [filter, setFilter] = useState("all")

  // Previously a failed request left an empty list, which looked exactly like
  // "you have no tasks yet".
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [busyIds, setBusyIds] = useState(() => new Set())

  const reduceMotion = useReducedMotion()

  const completed = tasks.filter((t) => t.completed).length
  const total = tasks.length
  const percent = total === 0 ? 0 : (completed / total) * 100

  const motionPercent = useMotionValue(percent)
  const springPercent = useSpring(motionPercent, { stiffness: 100, damping: 20 })
  const widthPercent = useTransform(springPercent, (value) => `${value}%`)
  const animatedPercent = useTransform(springPercent, (value) => Math.round(value))

  useEffect(() => {
    motionPercent.set(percent)
  }, [percent, motionPercent])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTasks(await fetchTasks())
    } catch (err) {
      // A 401 is already handled globally by the axios interceptor.
      setError(err.userMessage || "No se pudieron cargar las tareas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const markBusy = (id, busy) =>
    setBusyIds((current) => {
      const next = new Set(current)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })

  const handleAdd = async () => {
    const title = newTask.trim()
    if (!title) {
      toast.error("La tarea no puede estar vacía")
      return
    }

    setAdding(true)
    try {
      const task = await createTask(title)
      setTasks((current) => [task, ...current])
      setNewTask("")
      toast.success("Tarea añadida")
    } catch (err) {
      toast.error(err.userMessage || "Error al añadir la tarea")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id) => {
    markBusy(id, true)
    try {
      await deleteTask(id)
      setTasks((current) => current.filter((t) => t._id !== id))
      toast.success("Tarea eliminada")
    } catch (err) {
      toast.error(err.userMessage || "Error al eliminar la tarea")
    } finally {
      markBusy(id, false)
    }
  }

  const toggleComplete = async (task) => {
    markBusy(task._id, true)
    try {
      const updated = await updateTask(task._id, { completed: !task.completed })
      setTasks((current) =>
        current.map((t) => (t._id === updated._id ? updated : t)),
      )
    } catch (err) {
      toast.error(err.userMessage || "Error al actualizar la tarea")
    } finally {
      markBusy(task._id, false)
    }
  }

  const startEditing = (task) => {
    setEditingTaskId(task._id)
    setEditingText(task.title)
  }

  const cancelEditing = () => {
    setEditingTaskId(null)
    setEditingText("")
  }

  /**
   * Saving used to also run on blur through a timeout, which fired after cancel
   * had already cleared the id and sent a PUT to /api/tasks/null.
   */
  const saveEditing = async () => {
    const id = editingTaskId
    const title = editingText.trim()

    if (!id) return
    if (!title) {
      toast.error("La tarea no puede estar vacía")
      return
    }

    markBusy(id, true)
    try {
      const updated = await updateTask(id, { title })
      setTasks((current) =>
        current.map((t) => (t._id === updated._id ? updated : t)),
      )
      cancelEditing()
      toast.success("Tarea actualizada")
    } catch (err) {
      toast.error(err.userMessage || "Error al actualizar la tarea")
    } finally {
      markBusy(id, false)
    }
  }

  const handleEditKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      saveEditing()
    } else if (event.key === "Escape") {
      event.preventDefault()
      cancelEditing()
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.completed
    if (filter === "pending") return !task.completed
    return true
  })

  const counts = {
    all: total,
    pending: total - completed,
    completed,
  }

  return (
    <Card className="w-full">
      <div className="flex gap-3">
        <Input
          placeholder="Nueva tarea"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleAdd()
            }
          }}
          maxLength={200}
          aria-label="Nueva tarea"
          disabled={adding}
        />
        <Button onClick={handleAdd} disabled={adding} className="shrink-0">
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Añadir
        </Button>
      </div>

      {total > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-center text-sm text-muted">
            <motion.span>{animatedPercent}</motion.span>% completado ({completed}/
            {total})
          </p>
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
              style={{ width: reduceMotion ? `${percent}%` : widthPercent }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {FILTERS.map(({ id, label }) => {
          const isActive = filter === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={isActive}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-accent text-on-accent"
                  : "bg-surface-2 text-muted hover:text-text"
              }`}
            >
              {label}
              <span className={isActive ? "ml-1.5 opacity-80" : "ml-1.5 text-faint"}>
                {counts[id]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted">
            <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
            <p>Cargando tareas...</p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 py-10 text-center"
          >
            <AlertCircle className="h-7 w-7 text-danger" aria-hidden="true" />
            <div>
              <p className="font-semibold text-text">{error}</p>
              <p className="mt-1 text-sm text-muted">
                Comprueba tu conexión e inténtalo de nuevo.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadTasks}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="h-12 w-12 text-border-strong" aria-hidden="true" />
            <p className="font-semibold text-text">{EMPTY_STATE[filter].title}</p>
            <p className="text-sm text-muted">{EMPTY_STATE[filter].hint}</p>
          </div>
        ) : (
          <ul className="max-h-[420px] space-y-3 overflow-y-auto">
            <AnimatePresence initial={false}>
              {filteredTasks.map((task) => {
                const isEditing = editingTaskId === task._id
                const isBusy = busyIds.has(task._id)

                return (
                  <motion.li
                    key={task._id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleComplete(task)}
                        disabled={isBusy}
                        aria-label={
                          task.completed
                            ? `Marcar "${task.title}" como pendiente`
                            : `Marcar "${task.title}" como completada`
                        }
                        aria-pressed={task.completed}
                        className="shrink-0 disabled:opacity-50"
                      >
                        {task.completed ? (
                          <CircleCheckBig className="h-5 w-5 text-success" />
                        ) : (
                          <Circle className="h-5 w-5 text-faint" />
                        )}
                      </button>

                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          maxLength={200}
                          aria-label="Editar tarea"
                          className="h-9"
                        />
                      ) : (
                        <span
                          className={`min-w-0 flex-1 truncate ${
                            task.completed
                              ? "text-faint line-through"
                              : "text-text"
                          }`}
                          title={task.title}
                        >
                          {task.title}
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={saveEditing}
                            disabled={isBusy}
                            aria-label="Guardar cambios"
                          >
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={cancelEditing}
                            aria-label="Cancelar edición"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(task)}
                            aria-label={`Editar "${task.title}"`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="danger"
                            size="icon"
                            onClick={() => handleDelete(task._id)}
                            disabled={isBusy}
                            aria-label={`Eliminar "${task.title}"`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </Card>
  )
}

import { useState, useEffect } from "react"
import { fetchTasks, createTask, deleteTask, updateTask } from "../services/taskService"
import { Trash2, Edit2, Check, X, ClipboardList, CircleCheckBig, Circle } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import toast from "react-hot-toast"
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion"

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState("")
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingText, setEditingText] = useState("")
  const [filter, setFilter] = useState("all")

  const completed = tasks.filter(t => t.completed).length
  const total = tasks.length
  const percent = total === 0 ? 0 : (completed / total) * 100
  const motionPercent = useMotionValue(percent)
  const springPercent = useSpring(motionPercent, { stiffness: 100, damping: 20 })
  const widthPercent = useTransform(springPercent, (value) => `${value}%`)
  const animatedPercent = useTransform(springPercent, (value) => Math.round(value))

  useEffect(() => {
    motionPercent.set(percent)
  }, [percent])

  const loadTasks = async () => {
    const data = await fetchTasks()
    setTasks(data)
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleAdd = async () => {
    if (!newTask.trim()) {
      toast.error("La tarea no puede estar vacía")
      return
    }
    try {
      const task = await createTask(newTask)
      setTasks([task, ...tasks])
      setNewTask("")
      toast.success("Tarea añadida ✅")
    } catch {
      toast.error("Error al añadir tarea")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTask(id)
      setTasks(tasks.filter(t => t._id !== id))
      toast.success("Tarea eliminada 🗑️")
    } catch {
      toast.error("Error al eliminar tarea")
    }
  }

  const toggleComplete = async (task) => {
    try {
      const updated = await updateTask(task._id, { completed: !task.completed })
      setTasks(tasks.map(t => (t._id === task._id ? updated : t)))
      toast.success(`Tarea marcada como ${updated.completed ? "completada" : "pendiente"}`)
    } catch {
      toast.error("Error al actualizar tarea")
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

  const saveEditing = async () => {
    if (!editingText.trim()) {
      toast.error("La tarea no puede estar vacía")
      return
    }
    try {
      const updated = await updateTask(editingTaskId, { title: editingText })
      setTasks(tasks.map(t => (t._id === editingTaskId ? updated : t)))
      toast.success("Tarea actualizada ✏️")
      cancelEditing()
    } catch {
      toast.error("Error al actualizar tarea")
    }
  }

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEditing()
    } else if (e.key === "Escape") {
      cancelEditing()
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === "completed") return task.completed
    if (filter === "pending") return !task.completed
    return true
  })

  return (
    <div className="w-full flex justify-center">
      <Card className="w-full max-w-4xl p-8 rounded-xl shadow-lg bg-white border border-gray-200 transition-all duration-300">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          📝 Mis Tareas
        </h2>

        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Nueva tarea"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={100}
            aria-label="Nueva tarea"
            className="flex-grow px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleAdd}
            className="shrink-0 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
          >
            Añadir
          </Button>
        </div>

        <div className="mb-6">
          <motion.p className="text-sm text-gray-500 mb-1 text-center">
            <motion.span>{animatedPercent}</motion.span>% completado ({completed}/{total})
          </motion.p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              style={{ width: widthPercent }}
            />
          </div>
        </div>

        <div className="mb-6 flex gap-2 justify-center">
          <Button onClick={() => setFilter('all')}>Todas</Button>
          <Button onClick={() => setFilter('completed')}>Completadas</Button>
          <Button onClick={() => setFilter('pending')}>Pendientes</Button>
        </div>

        <ul className="space-y-4 max-h-[400px] overflow-y-auto w-full">
          <AnimatePresence>
            {filteredTasks.map(task => (
              <motion.li
                key={task._id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="flex justify-between items-center bg-gray-50 px-5 py-3 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-grow">
                  <button
                    onClick={() => toggleComplete(task)}
                    className="focus:outline-none"
                    aria-label="Toggle completa"
                  >
                    {task.completed ? (
                      <CircleCheckBig className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {editingTaskId === task._id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={(e) => {
                        setTimeout(saveEditing, 100)
                      }}
                      className="flex-grow p-2 rounded border border-gray-300"
                    />
                  ) : (
                    <span
                      className={`flex-grow select-none text-base cursor-pointer ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                    >
                      {task.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {editingTaskId === task._id ? (
                    <>
                      <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={saveEditing} aria-label="Guardar edición">
                        <Check className="h-5 w-5 text-green-600 hover:text-green-700" />
                      </Button>
                      <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={cancelEditing} aria-label="Cancelar edición">
                        <X className="h-5 w-5 text-red-600 hover:text-red-700" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onMouseDown={(e) => e.preventDefault()} onClick={() => startEditing(task)} aria-label="Editar tarea">
                        <Edit2 className="h-5 w-5 text-blue-600 hover:text-blue-700" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(task._id)} aria-label="Eliminar tarea">
                        <Trash2 className="h-5 w-5 text-red-500 hover:text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {tasks.length === 0 && (
          <div className="text-center mt-10 text-gray-400 flex flex-col items-center">
            <ClipboardList className="w-16 h-16 mb-2 text-gray-300" />
            <p>No tienes tareas aún. ¡Agrega una!</p>
          </div>
        )}
      </Card>
    </div>
  )
}

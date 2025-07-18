import { useState, useEffect } from "react"
import { fetchTasks, createTask, deleteTask, updateTask } from "../services/taskService"
import { Trash2, Edit2, Check, X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function TaskManager() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState("")
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingText, setEditingText] = useState("")

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

  // Manejar Enter y ESC en el input de edición
  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEditing()
    } else if (e.key === "Escape") {
      cancelEditing()
    }
  }

  return (
    <div className="w-full flex justify-center">
      <Card className="w-full max-w-3xl p-8 rounded-lg shadow-md bg-white border border-gray-100">
        <h2 className="text-3xl font-extrabold text-center mb-8 text-gray-900">Mis Tareas</h2>

        <div className="flex gap-4 mb-8">
          <Input
            placeholder="Nueva tarea"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            maxLength={100}
            aria-label="Nueva tarea"
            className="flex-grow"
          />
          <Button onClick={handleAdd} className="shrink-0 transition duration-200 hover:scale-105 bg-green-500 hover:bg-green-600 text-white">
            Añadir
          </Button>
        </div>

        <ul className="space-y-4 max-h-[400px] overflow-y-auto mb-4 w-11/12 mx-auto">
          <AnimatePresence>
            {tasks.map(task => (
              <motion.li
                key={task._id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="flex justify-between items-center px-5 py-3 rounded-md cursor-pointer bg-gray-50 hover:bg-green-50 shadow-sm hover:shadow-md transition-shadow duration-300 mx-auto w-full max-w-[600px]"
              >
                {/* Texto o input editable */}
                {editingTaskId === task._id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={saveEditing}
                    className="flex-grow p-2 border border-gray-300 rounded"
                  />
                ) : (
                  <span
                    onClick={() => toggleComplete(task)}
                    className={`select-none text-base flex-grow ${
                      task.completed ? "line-through text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {task.title}
                  </span>
                )}

                {/* Botones */}
                <div className="flex items-center gap-2 ml-4">
                  {editingTaskId === task._id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={saveEditing}
                        aria-label="Guardar edición"
                        className="text-green-600 hover:text-green-800"
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelEditing}
                        aria-label="Cancelar edición"
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(task)}
                        aria-label="Editar tarea"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task._id)}
                        aria-label="Eliminar tarea"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {tasks.length === 0 && (
          <p className="text-center text-gray-500">No tienes tareas aún. ¡Agrega una!</p>
        )}
      </Card>
    </div>
  )
}

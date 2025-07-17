import { useState, useEffect } from "react"
import { fetchTasks, createTask, deleteTask, updateTask } from "../services/taskService"
import { Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function TaskManager() {
    const [tasks, setTasks] = useState([])
    const [newTask, setNewTask] = useState("")

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

    return (
        <div className="text-black dark:text-white flex justify-center items-start p-10">
            <Card className="w-full max-w-4xl p-10 rounded-lg shadow-lg bg-white dark:bg-gray-800">
                <h2 className="text-4xl font-extrabold text-center mb-8">Mis Tareas</h2>

                <div className="flex gap-4 mb-8">
                    <Input
                        placeholder="Nueva tarea"
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                        maxLength={100}
                        aria-label="Nueva tarea"
                        className="flex-grow"
                    />
                    <Button onClick={handleAdd} className="shrink-0">
                        Añadir
                    </Button>
                </div>

                <ul className="space-y-4 max-h-[400px] overflow-y-auto mb-8">
                    <AnimatePresence>
                        {tasks.map(task => (
                            <motion.li
                                key={task._id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2 }}
                                className="flex justify-between items-center px-4 py-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                                <span
                                    onClick={() => toggleComplete(task)}
                                    className={`select-none ${task.completed ? "line-through text-gray-400" : ""}`}
                                >
                                    {task.title}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(task._id)}>
                                    <Trash2 className="h-5 w-5 text-red-500" />
                                </Button>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>

                <Button
                    onClick={() => {
                        localStorage.removeItem("token")
                        window.location.href = "/login"
                    }}
                    className="w-full"
                >
                    Logout
                </Button>
            </Card>
        </div>
    )
}

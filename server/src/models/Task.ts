import { Schema, model, type Types } from 'mongoose'
import {
  MAX_TAGS_PER_TASK,
  PRIORITIES,
  TAG_MAX_LENGTH,
  TITLE_MAX,
  type Task as TaskDTOShape,
  type TaskPriority,
} from '@task-manager/shared'

export interface TaskDoc {
  _id: Types.ObjectId
  title: string
  completed: boolean
  /** Cuándo se completó, para poder responder «¿qué he hecho hoy?». */
  completedAt: Date | null
  /**
   * `YYYY-MM-DD`, no Date: un vencimiento es un día completo y guardarlo como
   * instante lo ata a un huso horario que no es necesariamente el del usuario.
   */
  dueDate: string | null
  priority: TaskPriority
  tags: string[]
  user: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const taskSchema = new Schema<TaskDoc>(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [TITLE_MAX, `El título no puede superar los ${TITLE_MAX} caracteres`],
    },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    dueDate: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD'],
    },
    priority: {
      type: String,
      enum: { values: [...PRIORITIES], message: 'Prioridad no válida' },
      default: 'medium',
    },
    tags: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (tags: string[]) => tags.length <= MAX_TAGS_PER_TASK,
          message: `Máximo ${MAX_TAGS_PER_TASK} etiquetas por tarea`,
        },
        {
          validator: (tags: string[]) => tags.every((t) => t.length <= TAG_MAX_LENGTH),
          message: `Cada etiqueta puede tener hasta ${TAG_MAX_LENGTH} caracteres`,
        },
      ],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

// El listado por defecto: filtrar por dueño y ordenar por fecha de creación.
// Sin el índice compuesto, Mongo ordena en memoria y revienta a los 32 MB.
taskSchema.index({ user: 1, createdAt: -1 })
// Filtros de estado y vencimiento, que casi siempre van juntos.
taskSchema.index({ user: 1, completed: 1, dueDate: 1 })
// Filtro por etiqueta (índice multiclave sobre el array).
taskSchema.index({ user: 1, tags: 1 })

export function toTaskDTO(doc: TaskDoc): TaskDTOShape {
  return {
    id: doc._id.toString(),
    title: doc.title,
    completed: doc.completed,
    dueDate: doc.dueDate,
    priority: doc.priority,
    tags: doc.tags,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  }
}

export const Task = model<TaskDoc>('Task', taskSchema)

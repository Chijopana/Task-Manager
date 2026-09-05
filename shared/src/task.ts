import { z } from 'zod'
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_TAGS_PER_TASK,
  PRIORITIES,
  TITLE_MAX,
} from './constants.js'
import { DATE_PATTERN, isCalendarDate } from './date.js'
import { normalizeTag } from './tag.js'

export const prioritySchema = z.enum(PRIORITIES)

export const tagSchema = z
  .string()
  .transform(normalizeTag)
  .refine((tag) => tag.length > 0, 'Una etiqueta no puede quedar vacía')

export const tagsSchema = z
  .array(tagSchema)
  .max(MAX_TAGS_PER_TASK, `Máximo ${MAX_TAGS_PER_TASK} etiquetas por tarea`)
  // Duplicadas tras normalizar («Casa» y «casa») cuentan como una sola.
  .transform((tags) => [...new Set(tags)])

export const dueDateSchema = z
  .string()
  .regex(DATE_PATTERN, 'La fecha debe tener el formato AAAA-MM-DD')
  .refine(isCalendarDate, 'Esa fecha no existe en el calendario')

export const titleSchema = z
  .string()
  .trim()
  .min(1, 'El título es obligatorio')
  .max(TITLE_MAX, `El título no puede superar los ${TITLE_MAX} caracteres`)

export const createTaskSchema = z.object({
  title: titleSchema,
  dueDate: dueDateSchema.nullable().default(null),
  priority: prioritySchema.default('medium'),
  tags: tagsSchema.default([]),
})

/**
 * Lista blanca explícita de lo que se puede cambiar. Cualquier otro campo del
 * cuerpo —`user`, `_id`, `createdAt`— se descarta antes de llegar a la consulta.
 */
export const updateTaskSchema = z
  .object({
    title: titleSchema,
    completed: z.boolean(),
    dueDate: dueDateSchema.nullable(),
    priority: prioritySchema,
    tags: tagsSchema,
  })
  .partial()
  .refine(
    (body) => Object.keys(body).length > 0,
    'Nada que actualizar (campos válidos: title, completed, dueDate, priority, tags)',
  )

export const STATUS_FILTERS = ['all', 'pending', 'completed'] as const
export const DUE_FILTERS = ['any', 'overdue', 'today', 'week', 'none'] as const
export const SORT_FIELDS = ['created', 'due', 'priority', 'title'] as const

/**
 * `today` lo manda el cliente porque el servidor no sabe en qué huso está el
 * usuario: «vence hoy» solo tiene sentido contra el calendario de quien mira.
 */
export const taskQuerySchema = z.object({
  status: z.enum(STATUS_FILTERS).default('all'),
  due: z.enum(DUE_FILTERS).default('any'),
  today: z
    .string()
    .regex(DATE_PATTERN)
    .refine(isCalendarDate)
    .optional(),
  tag: z.string().transform(normalizeTag).optional(),
  priority: prioritySchema.optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(SORT_FIELDS).default('created'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  dueDate: z.string().nullable(),
  priority: prioritySchema,
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
})

export const taskListSchema = z.object({
  tasks: z.array(taskSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
  /** Contadores del conjunto completo, no solo de la página que se devuelve. */
  counts: z.object({
    all: z.number(),
    pending: z.number(),
    completed: z.number(),
    overdue: z.number(),
  }),
  /** Vocabulario real de etiquetas del usuario, para poder ofrecer el filtro. */
  tags: z.array(z.object({ tag: z.string(), count: z.number() })),
})

export type TaskPriority = z.infer<typeof prioritySchema>
export type Task = z.infer<typeof taskSchema>
export type TaskList = z.infer<typeof taskListSchema>
export type CreateTaskInput = z.input<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type TaskQuery = z.infer<typeof taskQuerySchema>
export type StatusFilter = (typeof STATUS_FILTERS)[number]
export type DueFilter = (typeof DUE_FILTERS)[number]
export type SortField = (typeof SORT_FIELDS)[number]

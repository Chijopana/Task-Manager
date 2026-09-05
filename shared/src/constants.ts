/**
 * Límites que el cliente y el servidor tienen que compartir por fuerza: si el
 * formulario acepta 200 caracteres y la API corta en 150, el usuario descubre la
 * regla real cuando ya ha escrito el texto.
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 30

/** Solo se exige al crear la cuenta. El login nunca valida la política: hacerlo
 *  dejaría fuera a cuentas antiguas y filtraría cuál es esa política. */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

export const TITLE_MAX = 200

export const TAG_MAX_LENGTH = 24
export const MAX_TAGS_PER_TASK = 8

/** Tope por cuenta. Sin él, un token válido basta para llenar el cluster. */
export const MAX_TASKS_PER_USER = 500

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

export const PRIORITIES = ['low', 'medium', 'high'] as const

export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

/** Orden de mayor a menor urgencia, para ordenar en cliente y servidor igual. */
export const PRIORITY_RANK: Record<(typeof PRIORITIES)[number], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

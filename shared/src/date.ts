/**
 * Las fechas de vencimiento se guardan como `YYYY-MM-DD`, no como Date.
 *
 * Un vencimiento es un día entero, no un instante: si lo guardáramos como Date
 * quedaría fijado a medianoche en algún huso horario, y «vence hoy» daría
 * resultados distintos según dónde esté el usuario. Con una cadena de fecha, el
 * cliente compara contra su propio día local y no hay conversión que se pueda
 * perder por el camino.
 */

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Comprueba que la cadena existe en el calendario: 2026-02-31 no. */
export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

/** El día de hoy según el reloj del navegador, en `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Suma días a una fecha `YYYY-MM-DD` sin tocar husos horarios. */
export function addDaysISO(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  return shifted.toISOString().slice(0, 10)
}

/** Días entre dos fechas. Negativo si `date` ya pasó. */
export function daysBetween(from: string, to: string): number {
  const parse = (v: string) => {
    const [y, m, d] = v.split('-').map(Number) as [number, number, number]
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((parse(to) - parse(from)) / 86_400_000)
}

export type DueState = 'none' | 'overdue' | 'today' | 'soon' | 'later'

/** Cómo de urgente es un vencimiento respecto al día de hoy. */
export function dueState(dueDate: string | null, today: string): DueState {
  if (!dueDate) return 'none'
  const diff = daysBetween(today, dueDate)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7) return 'soon'
  return 'later'
}

const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const SHORT_DATE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const LONG_DATE = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** «ayer», «hoy», «en 3 días», o la fecha corta si queda lejos. */
export function formatDueDate(dueDate: string, today: string): string {
  const diff = daysBetween(today, dueDate)
  if (Math.abs(diff) <= 7) return RELATIVE.format(diff, 'day')

  const [y, m, d] = dueDate.split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d)
  const sameYear = y === Number(today.slice(0, 4))
  return sameYear ? SHORT_DATE.format(date) : LONG_DATE.format(date)
}

/** Fecha completa, para el `title` de un elemento que muestra la versión corta. */
export function formatDueDateLong(dueDate: string): string {
  const [y, m, d] = dueDate.split('-').map(Number) as [number, number, number]
  return LONG_DATE.format(new Date(y, m - 1, d))
}

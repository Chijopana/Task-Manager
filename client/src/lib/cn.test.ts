import { describe, expect, test } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  test('une clases sueltas', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center')
  })

  test('descarta los valores falsos', () => {
    expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2')
  })

  /**
   * La versión anterior era un `join(" ")`. Con ella, `cn("h-10", "h-9")`
   * devolvía "h-10 h-9" y ganaba la que apareciera más tarde en la hoja
   * compilada —`.h-10`, por el orden en que Tailwind las genera—, así que el
   * input del modo edición medía 40 px en vez de los 36 que pedía.
   */
  test('en un conflicto de Tailwind gana la última, no el orden del CSS', () => {
    expect(cn('h-10', 'h-9')).toBe('h-9')
    expect(cn('px-4 py-2', 'px-2')).toBe('py-2 px-2')
    expect(cn('text-text', 'text-danger')).toBe('text-danger')
  })

  test('no toca clases que no compiten entre sí', () => {
    expect(cn('h-10 w-full rounded-lg', 'h-9')).toBe('w-full rounded-lg h-9')
  })
})

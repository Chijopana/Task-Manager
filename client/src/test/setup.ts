import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

/**
 * jsdom no implementa matchMedia, que usan el tema y `useReducedMotion`.
 *
 * Se responde que sí a «prefers-reduced-motion» para que los tests corran sin
 * animaciones: con ellas activas, una tarea que sale de la lista se queda
 * montada mientras dura su animación de salida y las comprobaciones de que ha
 * desaparecido dependerían de cuándo termine.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

import { TAG_MAX_LENGTH } from './constants.js'

/**
 * Las etiquetas se normalizan antes de guardarse para que «Casa», «casa» y
 * «#casa » sean la misma, en vez de tres entradas distintas en el filtro.
 *
 * Vive fuera de los esquemas para que el cliente pueda usarla sin arrastrar Zod
 * al bundle del navegador.
 */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_áéíóúüñ]/g, '')
    .slice(0, TAG_MAX_LENGTH)
}

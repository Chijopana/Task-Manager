/**
 * Entrada sin Zod.
 *
 * El servidor necesita los esquemas para validar; el navegador solo necesita
 * los mismos límites y utilidades. Separarlos evita mandar el validador entero
 * —unos 60 KB comprimidos— a cada persona que abre la aplicación.
 */
export * from './constants.js'
export * from './date.js'
export * from './tag.js'

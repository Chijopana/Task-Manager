import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Une clases resolviendo los conflictos de Tailwind.
 *
 * La versión anterior era un `join(" ")`: al pasar `className="h-9"` a un
 * componente cuya base ya traía `h-10`, quedaban las dos y ganaba la que
 * apareciera más tarde en la hoja compilada, no la que pedía quien llamaba.
 * `twMerge` se queda con la última de cada grupo en conflicto.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

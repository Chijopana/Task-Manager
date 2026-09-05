/**
 * Error con un código de estado propio. Permite que un controlador señale «esto
 * es un 404» sin tener que construir la respuesta, y que el manejador central
 * decida si merece registrarse en el log o no.
 */
export class HttpError extends Error {
  readonly status: number
  readonly code: string | undefined
  /** Los fallos esperados (403 de CORS, 404, 409) no ensucian el log. */
  readonly expected: boolean

  constructor(
    status: number,
    message: string,
    options: { code?: string; expected?: boolean } = {},
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = options.code
    this.expected = options.expected ?? status < 500
  }
}

export const badRequest = (msg: string, code?: string) =>
  new HttpError(400, msg, { code })
export const unauthorized = (msg: string, code?: string) =>
  new HttpError(401, msg, { code })
export const forbidden = (msg: string, code?: string) =>
  new HttpError(403, msg, { code })
export const notFound = (msg: string, code?: string) => new HttpError(404, msg, { code })
export const conflict = (msg: string, code?: string) => new HttpError(409, msg, { code })

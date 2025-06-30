export class NotFoundError extends Error {
  statusCode: number
  constructor(message: string, detail?: string) {
    super(message)
    this.name = 'NotFoundError'
    this.statusCode = 404

    Object.setPrototypeOf(this, NotFoundError.prototype)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

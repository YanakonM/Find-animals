// Typed application error carrying an HTTP status. The central error handler
// (middleware/error.ts) translates these into JSON responses.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, 'bad_request', details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new HttpError(401, message, 'unauthorized');
  }
  static forbidden(message = 'Forbidden') {
    return new HttpError(403, message, 'forbidden');
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, message, 'not_found');
  }
  static conflict(message: string) {
    return new HttpError(409, message, 'conflict');
  }
}

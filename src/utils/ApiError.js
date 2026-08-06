/**
 * Structured application error. Thrown from services/controllers and caught
 * by the central error handler, which converts it into the standard
 * `{ success, message }` JSON response shape.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = "Bad request", details) {
    return new ApiError(400, message, details);
  }

  static notFound(message = "Resource not found", details) {
    return new ApiError(404, message, details);
  }

  static conflict(message = "Conflict", details) {
    return new ApiError(409, message, details);
  }

  static serviceUnavailable(message = "Service unavailable", details) {
    return new ApiError(503, message, details);
  }

  static internal(message = "Internal server error", details) {
    return new ApiError(500, message, details);
  }
}

export default ApiError;

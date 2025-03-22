// Custom error classes for the application

/**
 * Base Application Error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends BadRequestError {
  constructor(message = 'Validation failed', code = 'VALIDATION_ERROR') {
    super(message, code);
  }
}

/**
 * External API Error (for handling Azure DevOps API errors)
 */
export class ExternalAPIError extends AppError {
  constructor(
    message = 'External API error',
    statusCode = 503,
    code = 'EXTERNAL_API_ERROR',
    originalError = null,
  ) {
    super(message, statusCode, code);
    this.originalError = originalError;
  }
}

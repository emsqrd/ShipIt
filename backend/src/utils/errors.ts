// Custom error classes for the application
import { ErrorCode } from '../enums/errorCode.js';
import { HttpStatusCode } from '../enums/httpStatusCode.js';

// utility functions for error handling
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function getErrorStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}

/**
 * Base Application Error class
 */
export class AppError extends Error {
  constructor(
    message: string | undefined,
    public statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    public code = ErrorCode.INTERNAL_ERROR,
  ) {
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
  constructor(message = 'Bad request') {
    super(message, HttpStatusCode.BAD_REQUEST, ErrorCode.BAD_REQUEST);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatusCode.NOT_FOUND, ErrorCode.NOT_FOUND);
  }
}

/**
 * Validation Error (400)
 */
export class RequestValidationError extends BadRequestError {
  constructor(message = 'Validation failed') {
    super(message);
  }
}

/**
 * External API Error (for handling Azure DevOps API errors)
 */
export class ExternalAPIError extends AppError {
  constructor(
    message = 'External API error',
    statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    code = ErrorCode.INTERNAL_ERROR,
    public originalError: unknown = null,
  ) {
    super(message, statusCode, code);
    this.originalError = originalError;
  }
}

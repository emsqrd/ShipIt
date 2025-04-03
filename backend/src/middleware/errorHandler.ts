import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/errors.js';

interface ExtendedError extends Error {
  statusCode?: number;
  code?: string;
  response?: {
    status: number;
  };
}

// Central error handler middleware
export const errorHandler = (
  err: ExtendedError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log error for debugging
  console.error('Error:', err);

  // If headers already sent, let Express default error handler deal with it
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom application errors with instanceof check and fallback to name check
  if (
    err instanceof AppError ||
    (err &&
      [
        'AppError',
        'NotFoundError',
        'BadRequestError',
        'ValidationError',
        'ExternalAPIError',
      ].includes(err.name))
  ) {
    return res.status(err.statusCode || 500).json({
      status: 'error',
      message: err.message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle API-specific errors
  if (err.name === 'FetchError' || err.response) {
    const statusCode = err.response?.status || 503;
    const message = `External API error: ${err.message}`;
    return res.status(statusCode).json({
      status: 'error',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Default error (uncaught exceptions)
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Something went wrong';
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Middleware to catch async errors
export const catchAsync =
  (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

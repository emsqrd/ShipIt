import { env } from '../config/env.js';

import { NextFunction, Request, RequestHandler, Response } from 'express';

import { ErrorCode } from '../enums/ErrorCode.js';
import { HttpStatusCode } from '../enums/HttpStatusCode.js';
import { AppError } from '../utils/errors.js';

interface ExtendedError extends Error {
  statusCode?: HttpStatusCode | number | undefined;
  code?: ErrorCode | string | undefined;
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

  // Handle custom application errors with instanceof check
  if (err instanceof AppError) {
    return res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: err.message,
      code: err.code,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Default error (uncaught exceptions)
  const statusCode = err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
  const message =
    env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Something went wrong';
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Middleware to catch async errors
export const catchAsync =
  (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

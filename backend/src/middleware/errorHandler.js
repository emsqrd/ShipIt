// Custom error handling middleware
import { AppError } from '../utils/errors.js';

// Central error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // If headers already sent, let Express default error handler deal with it
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
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

// Middleware to catch async errors
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

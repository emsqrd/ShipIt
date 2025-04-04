import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { ErrorCode } from '../../enums/ErrorCode.js';
import { HttpStatusCode } from '../../enums/HttpStatusCode.js';
import { AppError } from '../../utils/errors.js';
import { catchAsync, errorHandler } from '../errorHandler.js';

// Mock environment variables
jest.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'development', // Use development environment by default for tests
  },
}));

describe('Error Handler Middleware', () => {
  // Mock Express request, response, and next function
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    (env as any).NODE_ENV = 'development'; // Reset to development after each test
  });

  describe('errorHandler function', () => {
    it('should pass error to next if headers already sent', () => {
      // Arrange
      const error = new Error('Test error');
      mockRes.headersSent = true;

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle AppError properly', () => {
      // Arrange
      const appError = new AppError(
        'Custom application error',
        HttpStatusCode.BAD_REQUEST,
        ErrorCode.BAD_REQUEST
      );

      // Act
      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Custom application error',
          code: ErrorCode.BAD_REQUEST,
          stack: expect.any(String) // Stack should be included in development mode
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use INTERNAL_SERVER_ERROR status code if not provided in AppError', () => {
      // Arrange
      const appError = new AppError('Error without status code');
      appError.statusCode = undefined;

      // Act
      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
    });

    it('should handle regular Error properly', () => {
      // Arrange
      const error = new Error('Standard error');

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Standard error',
          stack: expect.any(String) // Stack should be included in development mode
        })
      );
    });

    it('should handle error with statusCode property', () => {
      // Arrange
      const error = new Error('Error with status code') as any;
      error.statusCode = HttpStatusCode.NOT_FOUND;

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.NOT_FOUND);
    });

    it('should log the error', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error);
    });

    it('should hide error details in production environment', () => {
      // Arrange
      (env as any).NODE_ENV = 'production';
      const error = new Error('Sensitive error details');

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      });
      // Should not have stack trace in production
      expect(mockRes.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.anything(),
        })
      );
    });

    it('should include stack trace in development environment', () => {
      // Arrange
      const error = new Error('Error with stack trace');

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Error with stack trace',
          stack: expect.any(String)
        })
      );
    });
  });

  describe('catchAsync function', () => {
    it('should catch errors in async route handlers and pass them to next', async () => {
      // Arrange
      const error = new Error('Async error');
      const asyncHandler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = catchAsync(asyncHandler as any);

      // Act
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(asyncHandler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should not catch errors if function resolves successfully', async () => {
      // Arrange
      const asyncHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = catchAsync(asyncHandler as any);

      // Act
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(asyncHandler).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call the handler with correct parameters', async () => {
      // Arrange
      const asyncHandler = jest.fn().mockResolvedValue('success');
      const wrappedHandler = catchAsync(asyncHandler as any);

      // Act
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(asyncHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });
});
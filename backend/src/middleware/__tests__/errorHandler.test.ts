import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../../config/env';
import { ErrorCode } from '../../enums/ErrorCode';
import { HttpStatusCode } from '../../enums/HttpStatusCode';
import { AppError } from '../../utils/errors';
import { catchAsync, errorHandler } from '../errorHandler';

// Custom error class for testing
class CustomError extends Error {
  statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
  }
}

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
  let mockNext: NextFunction;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockReq = {} as Partial<Request>;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    } as Partial<Response>;
    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    env.NODE_ENV = 'development'; // Reset to development after each test
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
      const error = new CustomError('Error with status code', HttpStatusCode.NOT_FOUND);

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
      env.NODE_ENV = 'production';
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

    it('should set default error message in development environment if not provided', () => {
      // Arrange
      env.NODE_ENV = 'development';
      const error = new Error();

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Something went wrong',
        stack: expect.any(String)
      });
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
    
    it('should use default INTERNAL_SERVER_ERROR even when AppError has undefined statusCode', () => {
      // Arrange
      // Create an AppError and then force its statusCode to be undefined
      const appError = new AppError('Error with undefined status code');
      // @ts-expect-error - intentionally breaking the type to test fallback
      appError.statusCode = undefined;
    
      // Act
      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);
    
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Error with undefined status code',
          code: ErrorCode.INTERNAL_ERROR,
          stack: expect.any(String)
        })
      );
    });
  });

  describe('catchAsync function', () => {
    it('should catch errors in async route handlers and pass them to next', async () => {
      // Arrange
      const error = new Error('Async error');
      const asyncHandler = jest.fn<RequestHandler>().mockImplementation(() => {
        return Promise.reject(error);
      })
      
      const wrappedHandler = catchAsync(asyncHandler);

      // Act
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(asyncHandler).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
    
    it('should not catch errors if function resolves successfully', async () => {
      // Arrange
      const asyncHandler = jest.fn<RequestHandler>().mockImplementation(() => {
        return Promise.resolve();
      })
      const wrappedHandler = catchAsync(asyncHandler);
      
      // Act
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(asyncHandler).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should call the handler with correct parameters', async () => {
      // Arrange
      const asyncHandler = jest.fn<RequestHandler>().mockImplementation(() => {
        return Promise.resolve();
      })
      const wrappedHandler = catchAsync(asyncHandler);
      
      // Act
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(asyncHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });
});
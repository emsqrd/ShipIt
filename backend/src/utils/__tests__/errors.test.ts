// filepath: /Users/emsqrd/git/ShipIt/backend/src/utils/__tests__/errors.test.ts
import { describe, expect, it } from '@jest/globals';
import { ErrorCode } from '../../enums/ErrorCode';
import { HttpStatusCode } from '../../enums/HttpStatusCode';
import {
  AppError,
  BadRequestError,
  ExternalAPIError,
  NotFoundError,
  RequestValidationError,
  getErrorMessage,
  getErrorStatusCode,
} from '../errors';

describe('Error Utilities', () => {
  describe('getErrorMessage', () => {
    it('should return the message for Error instances', () => {
      // Arrange
      const error = new Error('Test error message');

      // Act
      const result = getErrorMessage(error);

      // Assert
      expect(result).toBe('Test error message');
    });

    it('should convert non-Error objects to strings', () => {
      // Act & Assert
      expect(getErrorMessage('string error')).toBe('string error');
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
      expect(getErrorMessage({ custom: 'error' })).toBe('[object Object]');
    });
  });

  describe('getErrorStatusCode', () => {
    it('should return statusCode from objects that have it', () => {
      // Arrange
      const error = { statusCode: HttpStatusCode.BAD_REQUEST, message: 'Error with status' };

      // Act
      const result = getErrorStatusCode(error);

      // Assert
      expect(result).toBe(HttpStatusCode.BAD_REQUEST);
    });

    it('should return undefined when object has no statusCode', () => {
      // Arrange
      const error = new Error('Regular error without status code');

      // Act
      const result = getErrorStatusCode(error);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined for primitive values', () => {
      // Act & Assert
      expect(getErrorStatusCode('string')).toBeUndefined();
      expect(getErrorStatusCode(123)).toBeUndefined();
      expect(getErrorStatusCode(null)).toBeUndefined();
      expect(getErrorStatusCode(undefined)).toBeUndefined();
    });
  });
});

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with default values', () => {
      // Arrange & Act
      const error = new AppError('Application error');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Application error');
      expect(error.statusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.name).toBe('AppError');
      expect(error.stack).toBeDefined();
    });

    it('should create an AppError with custom values', () => {
      // Arrange & Act
      const error = new AppError(
        'Custom error',
        HttpStatusCode.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );

      // Assert
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('BadRequestError', () => {
    it('should create a BadRequestError with default message', () => {
      // Arrange & Act
      const error = new BadRequestError();

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.name).toBe('BadRequestError');
    });

    it('should create a BadRequestError with custom message', () => {
      // Arrange & Act
      const error = new BadRequestError('Invalid input parameter');

      // Assert
      expect(error.message).toBe('Invalid input parameter');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default message', () => {
      // Arrange & Act
      const error = new NotFoundError();

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(HttpStatusCode.NOT_FOUND);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create a NotFoundError with custom message', () => {
      // Arrange & Act
      const error = new NotFoundError('User with ID 123 not found');

      // Assert
      expect(error.message).toBe('User with ID 123 not found');
      expect(error.statusCode).toBe(HttpStatusCode.NOT_FOUND);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
    });
  });

  describe('RequestValidationError', () => {
    it('should create a RequestValidationError with default message', () => {
      // Arrange & Act
      const error = new RequestValidationError();

      // Assert
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.name).toBe('RequestValidationError');
    });

    it('should create a RequestValidationError with custom message', () => {
      // Arrange & Act
      const error = new RequestValidationError('Email format is invalid');

      // Assert
      expect(error.message).toBe('Email format is invalid');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    });
  });

  describe('ExternalAPIError', () => {
    it('should create an ExternalAPIError with default values', () => {
      // Arrange & Act
      const error = new ExternalAPIError();

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('External API error');
      expect(error.statusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.originalError).toBeNull();
      expect(error.name).toBe('ExternalAPIError');
    });

    it('should create an ExternalAPIError with custom values', () => {
      // Arrange
      const originalError = new Error('Original API error');
      
      // Act
      const error = new ExternalAPIError(
        'Azure DevOps API error',
        HttpStatusCode.SERVICE_UNAVAILABLE,
        ErrorCode.AZURE_API_ERROR,
        originalError
      );

      // Assert
      expect(error.message).toBe('Azure DevOps API error');
      expect(error.statusCode).toBe(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(error.code).toBe(ErrorCode.AZURE_API_ERROR);
      expect(error.originalError).toBe(originalError);
    });
  });
});
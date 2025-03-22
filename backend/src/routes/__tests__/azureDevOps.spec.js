import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import ENVIRONMENT from '../../contracts/environment.js';

// Create proper ValidationError mock that will be returned in actual tests
class MockValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.code = 'VALIDATION_ERROR';
    this.name = 'ValidationError';
  }
}

// Mock the error classes
const mockValidationError = jest
  .fn()
  .mockImplementation((message) => new MockValidationError(message));

jest.unstable_mockModule('../../utils/errors.js', () => ({
  ValidationError: mockValidationError,
}));

// Mock the catchAsync middleware to pass through to the original function
// but wrap any errors in next()
const mockCatchAsync = jest.fn((fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
});

// Mock the error handler middleware
const mockErrorHandler = jest.fn((err, req, res, next) => {
  if (err.statusCode === 400) {
    return res.status(400).json({
      status: 'error',
      message: err.message,
    });
  }

  if (err.statusCode === 404) {
    return res.status(404).json({
      status: 'error',
      message: err.message,
    });
  }

  // Default error handler for all other errors
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

jest.unstable_mockModule('../../middleware/errorHandler.js', () => ({
  errorHandler: mockErrorHandler,
  catchAsync: mockCatchAsync,
}));

// Mock the service module before importing the router
const mockGetReleasedVersions = jest.fn();
jest.unstable_mockModule('../../services/azureDevOpsService.js', () => ({
  getReleasedVersions: mockGetReleasedVersions,
  default: { getReleasedVersions: mockGetReleasedVersions },
}));

// Import the router after setting up mocks
const azureDevOpsRouterModule = await import('../azureDevOps.js');
const azureDevOpsRouter = azureDevOpsRouterModule.default;

describe('Azure DevOps Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/azure', azureDevOpsRouter);

    // Add error handler middleware to the test app
    app.use(mockErrorHandler);
  });

  describe('GET /api/azure/releasedVersions', () => {
    it('should return 400 when environment parameter is missing', async () => {
      const response = await request(app).get('/api/azure/releasedVersions').expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Environment parameter is required',
      });
    });

    it('should return 400 when environment parameter is invalid', async () => {
      const response = await request(app)
        .get('/api/azure/releasedVersions?environment=invalid')
        .expect(400);

      expect(response.body).toEqual({
        status: 'error',
        message: `Invalid environment. Must be one of: ${Object.values(ENVIRONMENT).join(', ')}`,
      });
    });

    it('should return released versions for valid environment', async () => {
      const mockReleasedVersions = [
        {
          repo: 'TestRepo',
          pipelineName: 'TestPipeline',
          runName: 'Release 1.0.0',
          version: '1.0.0',
        },
      ];
      mockGetReleasedVersions.mockResolvedValue(mockReleasedVersions);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${ENVIRONMENT.DEV}`)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(mockGetReleasedVersions).toHaveBeenCalledWith(ENVIRONMENT.DEV);
    });

    it('should return empty array when no versions are found', async () => {
      mockGetReleasedVersions.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${ENVIRONMENT.DEV}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle service errors with error middleware', async () => {
      // Create mock error with status code
      const mockError = new Error('Service error');
      mockError.statusCode = 503;
      mockError.code = 'EXTERNAL_API_ERROR';

      mockGetReleasedVersions.mockRejectedValue(mockError);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${ENVIRONMENT.DEV}`)
        .expect(500);

      expect(response.body).toEqual({
        status: 'error',
        message: 'Internal server error',
      });

      // Verify that catchAsync was used in the route file
      expect(mockCatchAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle URL-encoded environment parameter', async () => {
      const mockReleasedVersions = [{ repo: 'TestRepo', version: '1.0.0' }];
      mockGetReleasedVersions.mockResolvedValue(mockReleasedVersions);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${encodeURIComponent(ENVIRONMENT.DEV)}`)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(mockGetReleasedVersions).toHaveBeenCalledWith(ENVIRONMENT.DEV);
    });

    it('should handle any valid environment value correctly', async () => {
      const mockReleasedVersions = [{ repo: 'TestRepo', version: '1.0.0' }];
      mockGetReleasedVersions.mockResolvedValue(mockReleasedVersions);

      // Test with a sample environment
      const testEnvironment = ENVIRONMENT.DEV;
      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${testEnvironment}`)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(mockGetReleasedVersions).toHaveBeenCalledWith(testEnvironment);
    });
  });
});

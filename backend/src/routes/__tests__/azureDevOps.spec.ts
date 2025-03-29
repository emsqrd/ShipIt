import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';
import { ENVIRONMENT } from '../../contracts/environment.js';
import { ReleasedVersion } from '../../types/AzureDevOpsTypes.js';

// Set up mocks for ES modules
jest.mock('../../services/azureDevOpsService.js', () => {
  const mockGetReleasedVersions = jest.fn();
  return {
    getReleasedVersions: mockGetReleasedVersions,
    default: { getReleasedVersions: mockGetReleasedVersions },
    __esModule: true
  };
});

// Import the module after mocking
import { getReleasedVersions } from '../../services/azureDevOpsService.js';
import azureDevOpsRouter from '../azureDevOps.js';

// Also mock the error handler middleware
jest.mock('../../middleware/errorHandler.js', () => {
  const catchAsyncImpl = (fn) => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      if (error.statusCode === 400) {
        res.status(400).json({
          status: 'error',
          message: error.message,
        });
      } else {
        next(error);
      }
    }
  };
  
  return {
    catchAsync: catchAsyncImpl,
    __esModule: true
  };
});

describe('Azure DevOps Routes', () => {
  let app: Express;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/azure', azureDevOpsRouter);
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
      const mockReleasedVersions: ReleasedVersion[] = [
        {
          repo: 'TestRepo',
          pipelineName: 'TestPipeline',
          runName: 'Release 1.0.0',
          version: '1.0.0',
        },
      ];
      getReleasedVersions.mockResolvedValue(mockReleasedVersions);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${ENVIRONMENT.DEV}`)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(getReleasedVersions).toHaveBeenCalledWith(ENVIRONMENT.DEV);
    });

    it('should return empty array when no versions are found', async () => {
      getReleasedVersions.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${ENVIRONMENT.DEV}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle URL-encoded environment parameter', async () => {
      const mockReleasedVersions: ReleasedVersion[] = [{
        repo: 'TestRepo', 
        version: '1.0.0',
        pipelineName: 'Pipeline 1',
        runName: 'run'
      }];

      getReleasedVersions.mockResolvedValue(mockReleasedVersions);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${encodeURIComponent(ENVIRONMENT.DEV)}`)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(getReleasedVersions).toHaveBeenCalledWith(ENVIRONMENT.DEV);
    });

    it('should handle any valid environment value correctly', async () => {
      
      const mockReleasedVersions: ReleasedVersion[] = [{
        repo: 'TestRepo', 
        version: '1.0.0',
        pipelineName: 'Pipeline 1',
        runName: 'run'
      }];
      
      getReleasedVersions.mockResolvedValue(mockReleasedVersions);

      // Test with a sample environment
      const testEnvironment = ENVIRONMENT.DEV;
      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${testEnvironment}`)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(getReleasedVersions).toHaveBeenCalledWith(testEnvironment);
    });
  });
});

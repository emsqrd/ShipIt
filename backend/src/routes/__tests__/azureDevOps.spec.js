import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import ENVIRONMENT from '../../contracts/environment.js';

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
  let server;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/azure', azureDevOpsRouter);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('GET /api/azure/releasedVersions', () => {
    it('should return 400 when environment parameter is missing', async () => {
      const response = await request(app)
        .get('/api/azure/releasedVersions')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Environment parameter is required',
      });
    });

    it('should return 400 when environment parameter is invalid', async () => {
      const response = await request(app)
        .get('/api/azure/releasedVersions?environment=invalid')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toEqual({
        error: `Invalid environment. Must be one of: ${Object.values(ENVIRONMENT).join(', ')}`,
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
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(mockGetReleasedVersions).toHaveBeenCalledWith(ENVIRONMENT.DEV);
    });

    it('should return empty array when no versions are found', async () => {
      mockGetReleasedVersions.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${ENVIRONMENT.DEV}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle service errors gracefully', async () => {
      mockGetReleasedVersions.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${ENVIRONMENT.DEV}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle URL-encoded environment parameter', async () => {
      const mockReleasedVersions = [{ repo: 'TestRepo', version: '1.0.0' }];
      mockGetReleasedVersions.mockResolvedValue(mockReleasedVersions);

      const response = await request(app)
        .get(`/api/azure/releasedVersions?environment=${encodeURIComponent(ENVIRONMENT.DEV)}`)
        .expect('Content-Type', /json/)
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
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockReleasedVersions);
      expect(mockGetReleasedVersions).toHaveBeenCalledWith(testEnvironment);
    });

    it('should set proper content-type for error responses', async () => {
      const response = await request(app)
        .get('/api/azure/releasedVersions')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});

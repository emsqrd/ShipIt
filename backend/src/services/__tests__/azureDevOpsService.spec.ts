import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExternalAPIError, NotFoundError } from '../../utils/errors.js';

import { ENVIRONMENT } from '../../contracts/environment.js';
import { PipelineResponse } from '../../types/AzureDevOpsTypes.js';

// Create a configurable mock object for ConfigService
const mockConfig = {
  buildDefinitionFolder: 'release',
  azureBaseUrl: 'https://mock-azure-url',
  azurePat: 'mock-pat',
  port: 3000,
  validate: jest.fn()
};

// Mock the module first, before any imports that might use it
jest.mock('../../clients/azureDevOpsClient.js', () => {
  return {
    __esModule: true,
    default: {
      getPipelines: jest.fn(),
      getPipelineRuns: jest.fn(),
      getPipelineRunDetails: jest.fn()
    }
  };
});

// Mock the configService module to return our configurable mockConfig object
jest.mock('../configService.js', () => ({
  __esModule: true,
  default: mockConfig
}));

// Import modules after mocking
import AzureDevOpsClient from '../../clients/azureDevOpsClient.js';
import { clearCache, getReleasedVersions } from '../azureDevOpsService.js';

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
console.error = jest.fn() as jest.Mock;

describe('azureDevOpsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockClear();
    clearCache();
    
    // Reset config mock to default values
    mockConfig.buildDefinitionFolder = 'release';
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('getReleasedVersions', () => {

    it('should throw ExternalAPIError when pipeline fetch fails', async () => {
      // Arrange
      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.reject());

      // Act & Assert
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(ExternalAPIError);
    });
    
    it('should throw NotFoundError when no pipelines are found', async () => {
      // Set up the mock implementation for this specific test
      const emptyPipelinesResponse: PipelineResponse = {
        value: []
      };
      
      // Cast to jest.Mock to access mockResolvedValue
      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(emptyPipelinesResponse));
  
      // Test that the function throws the expected error
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(NotFoundError);
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(/No pipelines found/);
    });


    it('should filter pipelines based on folder criteria', async () => {
      // Set custom buildDefinitionFolder for this test
      mockConfig.buildDefinitionFolder = 'release';
      
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
          { id: 2, name: 'Pipeline2', folder: 'release/path' },
          { id: 3, name: 'Pipeline3', folder: 'invalid/path' },
        ],
      };

      const mockPipelineRunsResponse = {
        value: [{
          id: 1,
          name: 'Pipeline1Run',
          templateParameters: {
            env: 'dev',
          },
          pipeline: { 
            id: 1, 
            name: 'Pipeline1', 
            folder: 'release' 
          },
        }]
      };

      const mockPipelineRunDetailsResponse = {
        id: 1,
        name: 'Pipeline1Run1Details',
        resources: {
          pipelines: {
            ['ci-artifact-pipeline']: {
              pipeline: {
                name: 'repo',
              },
              version: '1.0.0',
            }
          }
        }
      };

      const ReleasedVersions = [{
        repo: 'repo',
        pipelineId: 1,
        pipelineName: 'Pipeline1',
        runId: 1,
        runName: 'Pipeline1Run',
        version: '1.0.0'
      }];

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));

      const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
      mockGetPipelineRunDetails.mockImplementation(() => Promise.resolve(mockPipelineRunDetailsResponse));

      const result = await getReleasedVersions(ENVIRONMENT.DEV);
      expect(result).toEqual(ReleasedVersions);
    });

    it('should throw NotFoundError when no pipeline runs are found', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release/path' },
        ],
      };

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve({ value: []}));

      // Act & Assert
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(NotFoundError);
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(/No release pipelines found matching the criteria/);
      });

      it('should throw NotFoundError when no release pipelines match criteria', async () => {

      // Set the buildDefinitionFolder to something that won't match our mock data
      mockConfig.buildDefinitionFolder = 'release';

      // Set up mock data that will NOT match the criteria
      const mockReleasePipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'other/invalid' },
          { id: 2, name: 'Pipeline2', folder: 'also/invalid' },
        ],
      };

      // Make sure the mock correctly returns this data
      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockReleasePipelinesResponse))

      // Act & Assert
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(NotFoundError);
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(
        /No release pipelines found matching the criteria/,
      );
    });

    it('should process pipeline runs and return formatted released versions', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
        ],
      };

      const mockPipelineRunsResponse = {
        value: [{
          id: 1,
          name: 'Pipeline1Run',
          templateParameters: {
            env: 'dev',
          },
          pipeline: { 
            id: 1, 
            name: 'Pipeline1', 
            folder: 'release' 
          },
        }]
      };

      const mockPipelineRunDetailsResponse = {
        id: 1,
        name: 'Pipeline1Run1Details',
        resources: {
          pipelines: {
            ['ci-artifact-pipeline']: {
              pipeline: {
                name: 'repo',
              },
              version: '1.0.0',
            }
          }
        }
      };

      const ReleasedVersions = [{
        repo: 'repo',
        pipelineId: 1,
        pipelineName: 'Pipeline1',
        runId: 1,
        runName: 'Pipeline1Run',
        version: '1.0.0'
      }];

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));

      const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
      mockGetPipelineRunDetails.mockImplementation(() => Promise.resolve(mockPipelineRunDetailsResponse));

      // Act
      const result = await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(result).toEqual(ReleasedVersions);
    });

    it('should return empty array if no valid pipeline runs exist', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
      };

      // Empty pipeline runs
      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));

      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve({ value: [] }));

      // Act & Assert
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(NotFoundError);
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(
        /No release pipelines found matching the criteria/
      );
    });
  });

  describe('cache functionality', () => {
    it('should use cached pipeline data when available', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
        ],
      };

      const mockPipelineRunsResponse = {
        value: [{
          id: 1,
          name: 'Pipeline1Run',
          templateParameters: {
            env: 'dev',
          },
          pipeline: { 
            id: 1, 
            name: 'Pipeline1', 
            folder: 'release' 
          },
        }]
      };

      const mockPipelineRunDetailsResponse = {
        id: 1,
        name: 'Pipeline1Run1Details',
        resources: {
          pipelines: {
            ['ci-artifact-pipeline']: {
              pipeline: {
                name: 'repo',
              },
              version: '1.0.0',
            }
          }
        }
      };

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));

      const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
      mockGetPipelineRunDetails.mockImplementation(() => Promise.resolve(mockPipelineRunDetailsResponse));

      // Act - First call should hit the API
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Second call should use cache
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert - getPipelines should only be called once
      expect(AzureDevOpsClient.getPipelines).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when clearCache is called', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
        ],
      };

      const mockPipelineRunsResponse = {
        value: [{
          id: 1,
          name: 'Pipeline1Run',
          templateParameters: {
            env: 'dev',
          },
          pipeline: { 
            id: 1, 
            name: 'Pipeline1', 
            folder: 'release' 
          },
        }]
      };

      const mockPipelineRunDetailsResponse = {
        id: 1,
        name: 'Pipeline1Run1Details',
        resources: {
          pipelines: {
            ['ci-artifact-pipeline']: {
              pipeline: {
                name: 'repo',
              },
              version: '1.0.0',
            }
          }
        }
      };

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));

      const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
      mockGetPipelineRunDetails.mockImplementation(() => Promise.resolve(mockPipelineRunDetailsResponse));

      // Act - First call should hit the API
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Clear cache
      clearCache();

      // Second call should use cache
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(AzureDevOpsClient.getPipelines).toHaveBeenCalledTimes(2);
    });

    it('should expire cache after TTL period', async () => {
      // Arrange
      jest.useFakeTimers();

      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
        ],
      };

      const mockPipelineRunsResponse = {
        value: [{
          id: 1,
          name: 'Pipeline1Run',
          templateParameters: {
            env: 'dev',
          },
          pipeline: { 
            id: 1, 
            name: 'Pipeline1', 
            folder: 'release' 
          },
        }]
      };

      const mockPipelineRunDetailsResponse = {
        id: 1,
        name: 'Pipeline1Run1Details',
        resources: {
          pipelines: {
            ['ci-artifact-pipeline']: {
              pipeline: {
                name: 'repo',
              },
              version: '1.0.0',
            }
          }
        }
      };

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));

      const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
      mockGetPipelineRunDetails.mockImplementation(() => Promise.resolve(mockPipelineRunDetailsResponse));

      // Act - First call should hit the API
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Advance time beyond TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      // Second call should hit the API again due to expired cache
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(AzureDevOpsClient.getPipelines).toHaveBeenCalledTimes(2);

      // Clean up
      jest.useRealTimers();
    });
  });
});

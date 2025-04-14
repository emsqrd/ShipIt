import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExternalAPIError, NotFoundError } from '../../utils/errors';

import { ENVIRONMENT } from '../../enums/environment';
import { PipelineResponse } from '../../types/AzureDevOpsTypes';

// Create a configurable mock object for ConfigService
const mockConfig = {
  manualReleaseDirectory: 'manual',
  automatedReleaseDirectory: 'automated',
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
      getPipelineRunDetails: jest.fn(),
      getBuildTimeline: jest.fn()
    }
  };
});

// Mock the configService module to return our configurable mockConfig object
jest.mock('../configService.js', () => ({
  __esModule: true,
  default: mockConfig
}));

// Import modules after mocking
import AzureDevOpsClient from '../../clients/azureDevOpsClient';
import { clearCache, getReleasedVersions } from '../azureDevOpsService';

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
console.error = jest.fn() as jest.Mock;

describe('azureDevOpsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockClear();
    clearCache();
    
    // Reset config mock to default values
    mockConfig.manualReleaseDirectory = 'release';
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('getReleasedVersions', () => {
    it('should filter pipelines based on folder criteria', async () => {
      mockConfig.manualReleaseDirectory = 'release';
      
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

    it('should return automated pipelines if they exist for a repo', async () => {
      // Set custom manualReleaseDirectory for this test
      mockConfig.manualReleaseDirectory = 'manual';
      mockConfig.automatedReleaseDirectory = 'automated';
      
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'manual' },
          { id: 2, name: 'Pipeline2', folder: 'manual/path' },
          { id: 3, name: 'Pipeline3', folder: 'invalid/path' },
          { id: 4, name: 'Pipeline4', folder: 'automated'},
        ],
      };

      const mockPipelineRunsResponse = {
        value: [
          {
            id: 1,
            name: 'Pipeline1Run',
            createdDate: '01-01-2024',
            templateParameters: {
              env: 'dev',
            },
            pipeline: { 
              id: 1, 
              name: 'Pipeline1', 
              folder: 'manual' 
            },
          },
          {
            id: 4,
            name: 'Pipeline4Run',
            createdDate: '01-01-2025',
            pipeline: { 
              id: 4, 
              name: 'Pipeline4', 
              folder: 'automated' 
            },
          }
        ]
      };

      const mockPipelineRunDetails1Response = {
        id: 1,
        name: 'Pipeline1Run1Details',
        resources: {
          pipelines: {
            ['ci-artifact-pipeline']: {
              pipeline: {
                name: 'repo1',
              },
              version: '1.0.0',
            }
          }
        }
      };

      const mockPipelineRunDetails4Response = {
        id: 1,
        name: 'Pipeline4Run1Details',
        resources: {
          pipelines: {
            ['ci-artifact-pipeline']: {
              pipeline: {
                name: 'repo4',
              },
              version: '1.0.0',
            }
          }
        }
      };

      const ReleasedVersions = [
        {
          repo: 'repo1',
          pipelineId: 1,
          pipelineName: 'Pipeline1',
          runId: 1,
          runName: 'Pipeline1Run',
          version: '1.0.0'
        },
        {
          repo: 'repo4',
          pipelineId: 4,
          pipelineName: 'Pipeline4',
          runId: 4,
          runName: 'Pipeline4Run',
          version: '1.0.0'
        }
    ];

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));
  
      // Mock getBuildTimeline for automated pipeline
      const mockGetBuildTimeline = AzureDevOpsClient.getBuildTimeline as jest.Mock;
      mockGetBuildTimeline.mockImplementation(() => {
        // Mock a successful DevDeploy stage for Pipeline4
        return Promise.resolve({
          records: [
            {
              id: "1",
              parentId: null,
              type: "Stage",
              name: "DevDeploy",
              state: "completed",
              result: "succeeded"
            }
          ]
        });
      });
      
      const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
      mockGetPipelineRunDetails.mockImplementation((pipelineId) => {
        // Return different responses based on the pipeline ID
        if (pipelineId === 1) {
          return Promise.resolve(mockPipelineRunDetails1Response);
        } else if (pipelineId === 4) {
          return Promise.resolve(mockPipelineRunDetails4Response);
        }
        return Promise.reject(new Error(`Unexpected pipeline ID: ${pipelineId}`));
      });

      const result = await getReleasedVersions(ENVIRONMENT.DEV);
      expect(result).toEqual(ReleasedVersions);
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
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
        ],
      };

      const mockPipelineRunsResponse = {
        value: [
          {
            id: 1,
            name: 'Pipeline1Run',
            templateParameters: {
              env: 'dev1', //invalid environment
            },
            pipeline: { 
              id: 1, 
              name: 'Pipeline1', 
              folder: 'release' 
            },
          }
        ]
      };

      // Empty pipeline runs
      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));

      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));

      // Act
      const result = await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array if no artifact pipelines exist for pipeline runs', async () => {
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
          pipelines: {}
        }
      };

      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));

      const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
      mockGetPipelineRunDetails.mockImplementation(() => Promise.resolve(mockPipelineRunDetailsResponse));

      // Act
      const result = await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return most recent pipeline run for each pipeline', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
        ],
      };

      const mockPipelineRunsResponse = {
        value: [
          {
            id: 1,
            name: 'Pipeline1Run1',
            templateParameters: {
              env: 'dev',
            },
            createdDate: '01/01/2024',
            pipeline: { 
              id: 1, 
              name: 'Pipeline1', 
              folder: 'release' 
            },
          },
          {
            id: 2,
            name: 'Pipeline1Run2',
            templateParameters: {
              env: 'dev',
            },
            createdDate: '01/01/2025',
            pipeline: { 
              id: 1, 
              name: 'Pipeline1', 
              folder: 'release' 
            },
          },
        ]
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
        runId: 2,
        runName: 'Pipeline1Run2',
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
  });

  describe('error handling', () => {
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
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(
        /No release pipelines found matching the criteria/
      );
    });

    it('should throw NotFoundError when no release pipelines match criteria', async () => {

      // Set the manualReleaseDirectory to use for filtering
      mockConfig.manualReleaseDirectory = 'release';

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

    it('should wrap unexpected errors in ExternalAPIError', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release' },
        ],
      };
      
      const mockGetPipelines = AzureDevOpsClient.getPipelines as jest.Mock;
      mockGetPipelines.mockImplementation(() => Promise.resolve(mockPipelinesResponse));
      
      // Mock getPipelineRuns to throw an unexpected error (not an AppError)
      // This simulates a case where the client returns successfully but something goes wrong during processing
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => {
        throw new Error('Unexpected processing error');
      });
      
      // Act & Assert
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(ExternalAPIError);
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(/Failed to fetch released versions for environment/);
      expect(console.error).toHaveBeenCalled();
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
    
    it('calling clearCache() should remove the key from the cache when a key is provided', async () => {
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
    
      // Act - Populate the cache for different environments
      // First call for DEV environment - will populate the cache
      await getReleasedVersions(ENVIRONMENT.DEV);
      
      // Reset the call counts to make testing easier
      mockGetPipelines.mockClear();
      
      // Call clearCache with a specific pattern (DEV)
      clearCache('pipelines');
      
      // Second call for DEV - should hit the API again since its cache was cleared
      await getReleasedVersions(ENVIRONMENT.DEV);
      
      // Assert
      // We should see the getPipelines called only once (for DEV) since PROD is still cached
      expect(AzureDevOpsClient.getPipelines).toHaveBeenCalledTimes(1);
    });
  });
});

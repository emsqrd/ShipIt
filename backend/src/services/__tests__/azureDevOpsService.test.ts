import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExternalAPIError, NotFoundError } from '../../utils/errors';

import { ENVIRONMENT } from '../../enums/environment';
import { BuildTimelineResponse, PipelineResponse, PipelineRunDetailResponse, PipelineRunResponse } from '../../types/AzureDevOpsTypes';

// Define a test-specific version of PipelineRunDetailResponse that handles all possible structures
type TestPipelineRunDetailResponse = {
  id: number;
  name: string;
  resources: {
    pipelines: {
      ['ci-artifact-pipeline']?: {
        pipeline: {
          name: string | undefined;
        };
        version: string | undefined;
      };
    };
  };
};

// Create a configurable mock object for ConfigService
const mockConfig = {
  manualReleaseDirectory: 'manual',
  automatedReleaseDirectory: 'automated',
  azureBaseUrl: 'https://mock-azure-url',
  azurePat: 'mock-pat',
  port: 3000,
  validate: jest.fn()
};

// Mock the configService module to return our configurable mockConfig object
jest.mock('../configService.js', () => ({
  __esModule: true,
  default: mockConfig
}));

// Mock the AzureDevOpsClient first, before any imports that might use it
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

// Import modules after mocking
import AzureDevOpsClient from '../../clients/azureDevOpsClient';
import { __test__, clearCache, getReleasedVersions } from '../azureDevOpsService';

/**
 * Mock reference to allow calling mockClear() directly
 */
const mockGetPipelinesRef = AzureDevOpsClient.getPipelines as jest.Mock;

/**
 * Mocks the AzureDevOpsClient.getPipelines call to return the specified pipeline response
 * @param mockPipelineResponse The mock pipeline response to return
 * @returns The mocked getPipelines function
 */
const mockPipelineResponse = (mockPipelineResponse: PipelineResponse) => {
  mockGetPipelinesRef.mockImplementation(() => Promise.resolve(mockPipelineResponse));
  return mockGetPipelinesRef;
};

/**
 * Mocks the AzureDevOpsClient.getPipelineRuns call to return the specified pipeline runs response
 * @param mockPipelineRunsResponse The mock pipeline runs response to return
 * @returns The mocked getPipelineRuns function
 */
const mockPipelineRunsResponse = (mockPipelineRunsResponse: PipelineRunResponse) => {
  const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
  mockGetPipelineRuns.mockImplementation(() => Promise.resolve(mockPipelineRunsResponse));
  return mockGetPipelineRuns;
};

/**
 * Mocks the AzureDevOpsClient.getPipelineRunDetails call to return different responses based on run ID
 * @param runDetailsMap An object map where keys are run IDs and values are the corresponding mock responses
 * @returns The mocked getPipelineRunDetails function
 */
const mockPipelineRunDetailsResponses = (runDetailsMap: Record<number, TestPipelineRunDetailResponse>) => {
  const mockGetPipelineRunDetails = AzureDevOpsClient.getPipelineRunDetails as jest.Mock;
  mockGetPipelineRunDetails.mockImplementation((...args: unknown[]) => {
    // Extract runId from arguments (second argument)
    const runId = args[1] as number;
    if (runId in runDetailsMap) {
      return Promise.resolve(runDetailsMap[runId] as PipelineRunDetailResponse);
    }
    return Promise.reject(new Error(`No mock response configured for run ID: ${runId}`));
  });
  return mockGetPipelineRunDetails;
};

/**
 * Mocks the AzureDevOpsClient.getBuildTimeline call to return the specified build timeline response
 * @param mockBuildTimelineResponse The mock build timeline response to return
 * @returns The mocked getBuildTimeline function
 */
const mockBuildTimelineResponse = (mockBuildTimelineResponse: BuildTimelineResponse) => {
  const mockGetBuildTimeline = AzureDevOpsClient.getBuildTimeline as jest.Mock;
  mockGetBuildTimeline.mockImplementation(() => Promise.resolve(mockBuildTimelineResponse));
  return mockGetBuildTimeline;
};

// Mock data factories
const createMockPipeline = (id: number, name: string, folder: string) => ({
  id, 
  name, 
  folder,
});

const createMockPipelineRun = (id: number, name: string, env: string, createdDate: string, pipelineId: number, pipelineName: string, pipelineFolder: string) => ({
  id,
  name,
  createdDate,
  templateParameters: { env },
  pipeline: {
    id: pipelineId,
    name: pipelineName,
    folder: pipelineFolder
  }
});

const createMockPipelineRunDetails = (
  id: number, 
  name: string, 
  repoName?: string, 
  version?: string, 
  includeArtifactPipeline: boolean = true
) => ({
  id,
  name,
  resources: {
    pipelines: includeArtifactPipeline ? {
      ['ci-artifact-pipeline']: {
        pipeline: {
          name: repoName,
        },
        version,
      }
    } : {}
  }
});

const createMockBuildTimeline = (id: string, name: string) => ({
  id,
  parentId: null,
  type: "Stage",
  name,
  state: "completed",
  result: "succeeded",
});

const createMockReleasedVersion = (repo: string, pipelineId: number, pipelineName: string, runId: number, runName: string) => ({
  repo,
  pipelineId,
  pipelineName,
  runId,
  runName,
  version: '1.0.0',
});

// Common test fixtures
const mockPipelineFixtures = {
  manualReleasePipeline: createMockPipeline(1, 'Pipeline1', 'manual'),
  invalidPathPipeline: createMockPipeline(3, 'Pipeline3', 'invalid/path'),
  automatedReleasePipeline: createMockPipeline(4, 'Pipeline4', 'automated'),
};

const mockPipelineRunFixtures = {
  manualPipelineRun: createMockPipelineRun(1, 'Pipeline1Run1', 'dev', '01-01-2024', 1, 'Pipeline1', 'manual'),
  newerManualPipelineRun: createMockPipelineRun(2, 'Pipeline1Run2', 'dev', '01-01-2025', 1, 'Pipeline1', 'manual'),
  automatedPipelineRun: createMockPipelineRun(4, 'Pipeline4Run4', '', '01-01-2025', 4, 'Pipeline4', 'automated'),
  invalidEnvPipelineRun: createMockPipelineRun(1, 'Pipeline4Run4', 'dev1', '01-01-2025', 1, 'Pipeline1', 'manual'),
};

const mockPipelineRunDetailsFixtures = {
  manualPipelineRunDetails: createMockPipelineRunDetails(1, 'Pipeline1Run1Details', 'repo1', '1.0.0'),
  newerManualPipelineRunDetails: createMockPipelineRunDetails(2, 'Pipeline1Run2', 'repo1', '1.0.0'),
  automatedPipelineRunDetails: createMockPipelineRunDetails(4, 'Pipeline4Run4Details', 'repo4', '1.0.0'),
  missingArtifactPipelineRunDetails: createMockPipelineRunDetails(1, 'Pipeline1Run1Details', 'repo1', '1.0.0', false),
};

const mockBuildTimelineFixtures = {
  devDeploy: createMockBuildTimeline('1', 'DevDeploy'),
  intDeploy: createMockBuildTimeline('2', 'IntDeploy'),
}

const mockReleasedVersionsFixtures = {
  pipeline1Run1Repo1: createMockReleasedVersion('repo1', 1, 'Pipeline1', 1, 'Pipeline1Run1'),
  pipeline1Run2Repo1: createMockReleasedVersion('repo1', 1, 'Pipeline1', 2, 'Pipeline1Run2'),
  pipeline4Run4Repo4: createMockReleasedVersion('repo4', 4, 'Pipeline4', 4, 'Pipeline4Run4'),
}

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
console.error = jest.fn() as jest.Mock;

describe('azureDevOpsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockClear();
    clearCache();
    
    // Reset config mock to default values
    mockConfig.manualReleaseDirectory = 'manual';
    mockConfig.automatedReleaseDirectory = 'automated';
  });

  afterEach(() => {
    jest.resetAllMocks();
  })

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe ('internal functionality', () => {
    it('should filter pipelines based on folder criteria', async() => {

      const mockPipelines = [
        mockPipelineFixtures.manualReleasePipeline,
        mockPipelineFixtures.invalidPathPipeline,
      ];

      const releaseDirectories = ['manual'];
      
      const result = __test__.filterReleasePipelines(mockPipelines, releaseDirectories);
      expect(result).toEqual([
        mockPipelineFixtures.manualReleasePipeline,
      ]);
    });
  })

  describe('getReleasedVersions', () => {
    it('should return automated pipelines if they exist for a repo', async () => {
      // Arrange
      const mockPipelines = {
        value: [
          mockPipelineFixtures.manualReleasePipeline,
          mockPipelineFixtures.automatedReleasePipeline,
        ],
      };
    
      const mockPipelineRuns = {
        value: [
          mockPipelineRunFixtures.manualPipelineRun,
          mockPipelineRunFixtures.automatedPipelineRun
        ]
      };

      // Create a map of run IDs to their corresponding pipeline run details
      const runDetailsMap = {
        1: mockPipelineRunDetailsFixtures.manualPipelineRunDetails,
        4: mockPipelineRunDetailsFixtures.automatedPipelineRunDetails
      };

      const mockBuildTimeline = {
        records: [
          mockBuildTimelineFixtures.devDeploy
        ]
      };

      const releasedVersions = [
        mockReleasedVersionsFixtures.pipeline1Run1Repo1,
        mockReleasedVersionsFixtures.pipeline4Run4Repo4,
      ];

      // Use the helper functions to set up the mocks
      mockPipelineResponse(mockPipelines);
      mockPipelineRunsResponse(mockPipelineRuns);
      mockPipelineRunDetailsResponses(runDetailsMap);
      mockBuildTimelineResponse(mockBuildTimeline);
      
      // Act
      const result = await getReleasedVersions(ENVIRONMENT.DEV);
      
      // Assert
      expect(result).toEqual(releasedVersions);
    });

    it('should return empty array if no valid pipeline runs exist', async () => {
      // Arrange
      const mockPipelines = {
        value: [mockPipelineFixtures.manualReleasePipeline],
      };

      const mockPipelineRuns = {
        value: [mockPipelineRunFixtures.invalidEnvPipelineRun]
      };

      mockPipelineResponse(mockPipelines);
      mockPipelineRunsResponse(mockPipelineRuns);

      // Act
      const result = await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array if no artifact pipelines exist for pipeline runs', async () => {
      // Arrange
      const mockPipelines = {
        value: [mockPipelineFixtures.manualReleasePipeline],
      };

      const mockPipelineRuns = {
        value: [mockPipelineRunFixtures.manualPipelineRun]
      };

      const runDetailsMap = {
        1: mockPipelineRunDetailsFixtures.missingArtifactPipelineRunDetails,
      };

      mockPipelineResponse(mockPipelines);
      mockPipelineRunsResponse(mockPipelineRuns);
      mockPipelineRunDetailsResponses(runDetailsMap);
      
      // Act
      const result = await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return most recent pipeline run for each pipeline', async () => {
      // Arrange
      const mockPipelines = {
        value: [mockPipelineFixtures.manualReleasePipeline],
      };

      const mockPipelineRuns = {
        value: [
          mockPipelineRunFixtures.manualPipelineRun,
          mockPipelineRunFixtures.newerManualPipelineRun,
        ]
      };

      const runDetailsMap = {
        1: mockPipelineRunDetailsFixtures.manualPipelineRunDetails,
        2: mockPipelineRunDetailsFixtures.newerManualPipelineRunDetails,
      }

      const releasedVersions = [mockReleasedVersionsFixtures.pipeline1Run2Repo1];
   
      mockPipelineResponse(mockPipelines);
      mockPipelineRunsResponse(mockPipelineRuns);
      mockPipelineRunDetailsResponses(runDetailsMap);

      // Act
      const result = await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert
      expect(result).toEqual(releasedVersions);
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

      mockPipelineResponse(mockPipelinesResponse);
      
      const mockGetPipelineRuns = AzureDevOpsClient.getPipelineRuns as jest.Mock;
      mockGetPipelineRuns.mockImplementation(() => Promise.resolve({ value: []}));

      // Act & Assert
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(NotFoundError);
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(
        /No release pipelines found matching the criteria/
      );
    });

    it('should throw NotFoundError when no release pipelines match criteria', async () => {
      // Set up mock data that will NOT match the criteria
      const mockReleasePipelinesResponse = {
        value: [
          mockPipelineFixtures.invalidPathPipeline
        ],
      };

      // Make sure the mock correctly returns this data
      mockPipelineResponse(mockReleasePipelinesResponse)

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
      const mockPipelines = {
        value: [
          mockPipelineFixtures.manualReleasePipeline,
        ],
      };
      
      mockPipelineResponse(mockPipelines);
      
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
    beforeEach(() => {
      // Arrange
      const mockPipelines = {
        value: [
          mockPipelineFixtures.manualReleasePipeline,
        ],
      };

      const mockPipelineRuns = {
        value: [
          mockPipelineRunFixtures.manualPipelineRun,
        ]
      };

      const runDetailsMap = {
        1: mockPipelineRunDetailsFixtures.manualPipelineRunDetails,
      }

      mockPipelineResponse(mockPipelines);
      mockPipelineRunsResponse(mockPipelineRuns);
      mockPipelineRunDetailsResponses(runDetailsMap);
    });
    
    it('should use cached pipeline data when available', async () => {
      // Act - First call should hit the API
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Second call should use cache
      await getReleasedVersions(ENVIRONMENT.DEV);

      // Assert - getPipelines should only be called once
      expect(AzureDevOpsClient.getPipelines).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when clearCache is called', async () => {
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
      // Act - Populate the cache for different environments
      // First call for DEV environment - will populate the cache
      await getReleasedVersions(ENVIRONMENT.DEV);
      
      // Reset the call counts to make testing easier
      mockGetPipelinesRef.mockClear();
      
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

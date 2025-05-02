import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ExternalAPIError, NotFoundError } from '../../utils/errors';

import { ENVIRONMENT } from '../../enums/environment';
import { ErrorCode } from '../../enums/errorCode';
import { HttpStatusCode } from '../../enums/httpStatusCode';
import {
  BuildTimelineResponse,
  PipelineResponse,
  PipelineRun,
  PipelineRunDetailResponse,
  PipelineRunResponse
} from '../../types/AzureDevOpsTypes';

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
  MANUAL_RELEASE_DIRECTORY: 'manual',
  AUTOMATED_RELEASE_DIRECTORY: 'automated',
};

// Mock the configService module to return our configurable mockConfig object
jest.mock('../../app.js', () => ({
  __esModule: true,
  config: mockConfig
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

jest.mock('../../utils/logger');

// Mock the appInsightsClient module to prevent real telemetry calls
jest.mock('../../utils/appInsights', () => ({
  __esModule: true,
  appInsightsClient: { 
    trackException: jest.fn(),
    trackTrace: jest.fn(),
  }
}));

// Import modules after mocking
import AzureDevOpsClient from '../../clients/azureDevOpsClient';
import { logger } from '../../utils/logger';
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

const createMockPipelineRun = (id: number, name: string, createdDate: string, env?: string | undefined) => ({
  id,
  name,
  createdDate,
  templateParameters: env ? { 
    env
  } : {},
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
  manualReleasePipeline1: createMockPipeline(1, 'Pipeline1', 'manual'),
  automatedReleasePipeline2: createMockPipeline(2, 'Pipeline2', 'automated'),
  invalidPathPipeline3: createMockPipeline(3, 'Pipeline3', 'invalid/path'),
  manualReleasePipeline4: createMockPipeline(4, 'Pipeline4', 'manual'),
};

const mockPipelineRunFixtures = {
  pipelineRun1: createMockPipelineRun(1, 'PipelineRun1', '01-01-2024', 'dev'),
  invalidEnvPipelineRun2: createMockPipelineRun(2, 'PipelineRun2', '01-01-2025', 'dev1'),
  newerPipelineRun3: createMockPipelineRun(3, 'PipelineRun3', '01-01-2025', 'dev'),
  noEnvPipelineRun4: createMockPipelineRun(4, 'PipelineRun4', '01-01-2025'),
};

const mockPipelineRunDetailsFixtures = {
  pipelineRun1Repo1: createMockPipelineRunDetails(1, 'PipelineRun1Details', 'Repo1', '1.0.0'),
  pipelineRun3Repo1: createMockPipelineRunDetails(3, 'PipelineRun3Details', 'Repo1', '1.0.0'),
  pipelineRun4Repo1: createMockPipelineRunDetails(4, 'PipelineRun4Details', 'Repo1', '1.0.0'),
  pipelineRun4Repo4: createMockPipelineRunDetails(4, 'PipelineRun4Details', 'Repo4', '1.0.0'),
  missingArtifactPipelineRunDetails: createMockPipelineRunDetails(1, 'PipelineRun1Details', 'Repo1', '1.0.0', false),
};

const mockBuildTimelineFixtures = {
  devDeploy: createMockBuildTimeline('1', 'DevDeploy'),
  intDeploy: createMockBuildTimeline('2', 'IntDeploy'),
}

const mockReleasedVersionsFixtures = {
  pipeline1Run1Repo1: createMockReleasedVersion('Repo1', 1, 'Pipeline1', 1, 'PipelineRun1'),
  pipeline1Run2Repo1: createMockReleasedVersion('Repo1', 1, 'Pipeline1', 2, 'PipelineRun2'),
  pipeline1Run3Repo1: createMockReleasedVersion('Repo1', 1, 'Pipeline1', 3, 'PipelineRun3'),
  pipeline2Run4Repo1: createMockReleasedVersion('Repo1', 2, 'Pipeline2', 4, 'PipelineRun4'),
  pipeline2Run4Repo4: createMockReleasedVersion('Repo4', 2, 'Pipeline2', 4, 'PipelineRun4'),
  pipeline4Run3Repo1: createMockReleasedVersion('Repo1', 1, 'Pipeline1', 3, 'PipelineRun3'),
}

let loggerErrorSpy: ReturnType<typeof jest.spyOn>;

describe('azureDevOpsService', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    loggerErrorSpy = jest.spyOn(logger, 'error').mockReturnValue(logger);
    clearCache();

    // Reset config mock to default values
    mockConfig.MANUAL_RELEASE_DIRECTORY = 'manual';
    mockConfig.AUTOMATED_RELEASE_DIRECTORY = 'automated';
  });

  afterAll(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('internal functionality', () => {
    describe('filterReleasePipelines', () => {
      it('should filter pipelines based on folder criteria', async() => {
        const mockPipelines = [
          mockPipelineFixtures.manualReleasePipeline1,
          mockPipelineFixtures.invalidPathPipeline3,
        ];

        const releaseDirectories = ['manual'];

        const result = __test__.filterReleasePipelines(mockPipelines, releaseDirectories);
        expect(result).toEqual([
          mockPipelineFixtures.manualReleasePipeline1,
        ]);
      });
    });
    
    describe('getMostRecentRunPerRepo', () => {
      it('should group pipelines by repo and select most recent run', () => {
        // Arrange
        const olderRun = {
          id: 1,
          createdDate: '01-01-2024',
          pipelineRunDetail: { repo: 'repo1' },
        } as PipelineRun;
        
        const newerRun = {
          id: 2,
          createdDate: '01-02-2024',
          pipelineRunDetail: { repo: 'repo1' },
        } as PipelineRun;
        
        const anotherRepoRun = {
          id: 3,
          createdDate: '01-01-2024',
          pipelineRunDetail: { repo: 'repo2' },
        } as PipelineRun;
        
        const pipelineRuns = [olderRun, newerRun, anotherRepoRun];
        
        // Act
        const result = __test__.getMostRecentRunPerRepo(pipelineRuns);
        
        // Assert
        expect(result).toHaveLength(2);
        expect(result).toContainEqual(newerRun); // Should choose newer run for repo1
        expect(result).toContainEqual(anotherRepoRun); // Should include repo2's only run
      });
      
      it('should handle empty input array', () => {
        // Act
        const result = __test__.getMostRecentRunPerRepo([]);
        
        // Assert
        expect(result).toEqual([]);
      });
      
      it('should handle runs with identical timestamps', () => {
        // Arrange
        const sameTimeRun1 = {
          id: 1,
          createdDate: '01-01-2024',
          pipelineRunDetail: { repo: 'repo1' },
        } as PipelineRun;
        
        const sameTimeRun2 = {
          id: 2,
          createdDate: '01-01-2024',
          pipelineRunDetail: { repo: 'repo1' },
        } as PipelineRun;
        
        // First one in the array should be selected in case of identical timestamps
        // due to stable sort behavior
        const pipelineRuns = [sameTimeRun1, sameTimeRun2];
        
        // Act
        const result = __test__.getMostRecentRunPerRepo(pipelineRuns);
        
        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(sameTimeRun1.id);
      });
    });

    describe('findSuccessfulPipelineRunByStage', () => {
      it('should return a run with a successful stage', async () => {
        // Arrange        
        const mockPiplelineRunResponse = [
          mockPipelineRunFixtures.noEnvPipelineRun4,
        ];

        const mockBuildTimeline = {
          records: [
            mockBuildTimelineFixtures.devDeploy,
          ]
        };

        mockBuildTimelineResponse(mockBuildTimeline);

        // Act
        const result = await __test__.findSuccessfulPipelineRunByStage(mockPiplelineRunResponse, ENVIRONMENT.DEV);

        // Assert
        expect(result).toEqual(mockPipelineRunFixtures.noEnvPipelineRun4)
      });

      it('should return null if no successful stages are found for any runs', async () => {
        // Arrange        
        const mockPiplelineRunResponse = [
          mockPipelineRunFixtures.pipelineRun1,
        ];

        const mockBuildTimeline = {
          records: [],
        };

        mockBuildTimelineResponse(mockBuildTimeline);

        // Act
        const result = await __test__.findSuccessfulPipelineRunByStage(mockPiplelineRunResponse, ENVIRONMENT.DEV);

        // Assert
        expect(result).toEqual(null);
      });

      it('should return null when attempting to find stages for unconfigured environments', async () => {
        // Arrange
        const mockPipelineRunsResponse = [
          mockPipelineRunFixtures.noEnvPipelineRun4,
        ];

        // Act
        const result = await __test__.findSuccessfulPipelineRunByStage(mockPipelineRunsResponse, ENVIRONMENT.PERF1);

        // Assert
        expect(result).toEqual(null);
      })
    });
  });

  describe('getReleasedVersions', () => {
    describe('successful pipeline retrieval', () => {
      it('should return ReleasedVersions with manual pipelines if they exist', async() => {
        // Arrange
        const mockPipelines = {
          value: [mockPipelineFixtures.manualReleasePipeline1],
        }

        const mockPipelineRuns = {
          value: [mockPipelineRunFixtures.pipelineRun1],
        }

        const runDetailsMap = {
          1: mockPipelineRunDetailsFixtures.pipelineRun1Repo1,
        };

        const releasedVersions = [
          mockReleasedVersionsFixtures.pipeline1Run1Repo1,
        ];

        mockPipelineResponse(mockPipelines);
        mockPipelineRunsResponse(mockPipelineRuns);
        mockPipelineRunDetailsResponses(runDetailsMap);

        // Act
        const result = await getReleasedVersions(ENVIRONMENT.DEV);

        // Assert
        expect(result).toEqual(releasedVersions);
      });

      it('should return ReleasedVersions with automated pipelines if they exist', async () => {
        // Arrange
        const mockPipelines = {
          value: [
            mockPipelineFixtures.automatedReleasePipeline2,
          ],
        };

        const mockPipelineRuns = {
          value: [
            mockPipelineRunFixtures.noEnvPipelineRun4
          ]
        };

        const runDetailsMap = {
          4: mockPipelineRunDetailsFixtures.pipelineRun4Repo4
        };

        const mockBuildTimeline = {
          records: [
            mockBuildTimelineFixtures.devDeploy,
          ]
        };

        const releasedVersions = [
          mockReleasedVersionsFixtures.pipeline2Run4Repo4,
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

      it('should return most recent pipeline run for each pipeline', async () => {
        // Arrange
        const mockPipelines = {
          value: [mockPipelineFixtures.manualReleasePipeline1],
        };

        const mockPipelineRuns = {
          value: [
            mockPipelineRunFixtures.pipelineRun1,
            mockPipelineRunFixtures.newerPipelineRun3,
          ]
        };

        const runDetailsMap = {
          1: mockPipelineRunDetailsFixtures.pipelineRun1Repo1,
          3: mockPipelineRunDetailsFixtures.pipelineRun3Repo1,
        }

        const releasedVersions = [mockReleasedVersionsFixtures.pipeline1Run3Repo1];

        mockPipelineResponse(mockPipelines);
        mockPipelineRunsResponse(mockPipelineRuns);
        mockPipelineRunDetailsResponses(runDetailsMap);

        // Act
        const result = await getReleasedVersions(ENVIRONMENT.DEV);

        // Assert
        expect(result).toEqual(releasedVersions);
      });

      it('should group multiple pipelines for the same repo', async () => {
        // Arrange
        const mockPipelines = {
          value: [
            mockPipelineFixtures.manualReleasePipeline1,
            mockPipelineFixtures.manualReleasePipeline4,
          ]
        };

        const mockPipelineRuns = {
          value: [
            mockPipelineRunFixtures.pipelineRun1,
            mockPipelineRunFixtures.newerPipelineRun3,
          ]
        };

        const runDetailsMap = {
          1: mockPipelineRunDetailsFixtures.pipelineRun1Repo1,
          3: mockPipelineRunDetailsFixtures.pipelineRun3Repo1,
        }

        const releasedVersions = [
          mockReleasedVersionsFixtures.pipeline4Run3Repo1,
        ];

        mockPipelineResponse(mockPipelines);
        mockPipelineRunsResponse(mockPipelineRuns);
        mockPipelineRunDetailsResponses(runDetailsMap);

        // Act
        const result = await getReleasedVersions(ENVIRONMENT.DEV);

        // Assert
        expect(result).toEqual(releasedVersions);
      });
    });

    describe('empty result handling', () => {
      it('should return empty array if no pipeline runs exist for the environment', async () => {
        // Arrange
        const mockPipelines = {
          value: [mockPipelineFixtures.manualReleasePipeline1],
        };

        const mockPipelineRuns = {
          value: [mockPipelineRunFixtures.invalidEnvPipelineRun2]
        };

        mockPipelineResponse(mockPipelines);
        mockPipelineRunsResponse(mockPipelineRuns);

        // Act
        const result = await getReleasedVersions(ENVIRONMENT.DEV);

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array if no pipeline runs exist for a pipeline', async () => {
        // Arrange
        const mockPipelines = {
          value: [mockPipelineFixtures.manualReleasePipeline1],
        };

        const mockPipelineRuns = {
          value: [],
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
          value: [mockPipelineFixtures.manualReleasePipeline1],
        };

        const mockPipelineRuns = {
          value: [mockPipelineRunFixtures.pipelineRun1]
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
    });
  });

  describe('error handling', () => {
    it('should throw NotFoundError when no pipeline runs are found', async () => {
      // Arrange
      const mockPipelinesResponse = {
        value: [
          mockPipelineFixtures.invalidPathPipeline3,
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
          mockPipelineFixtures.invalidPathPipeline3
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
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(
        expect.objectContaining({
          constructor: NotFoundError,
          message: expect.stringMatching(/No pipelines found/)
        })
      );
    });

    it('should throw ExternalAPIError when build timeline fetch fails', async () => {
      // Arrange
      const mockPipelines = {
        value: [mockPipelineFixtures.automatedReleasePipeline2],
      };

      const mockPipelineRuns = {
        value: [mockPipelineRunFixtures.noEnvPipelineRun4],
      };

      const runDetailsMap = {
        4: mockPipelineRunDetailsFixtures.pipelineRun4Repo4,
      }

      mockPipelineResponse(mockPipelines);
      mockPipelineRunsResponse(mockPipelineRuns);
      mockPipelineRunDetailsResponses(runDetailsMap);

      const mockRejectedBuildTimelineResponse = AzureDevOpsClient.getBuildTimeline as jest.Mock;
      mockRejectedBuildTimelineResponse.mockImplementation(() => Promise.reject());

      // Act & Assert
      await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toThrow(
        expect.objectContaining({
          constructor: ExternalAPIError,
          message: expect.stringMatching(/Failed to fetch build pipeline/),
          statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
          code: ErrorCode.AZURE_BUILD_TIMELINE_RESULTS_ERROR
        })
      );

    })

    it('should wrap unexpected errors in ExternalAPIError', async () => {
      // Arrange
      const mockPipelines = {
        value: [
          mockPipelineFixtures.manualReleasePipeline1,
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
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('cache functionality', () => {
    beforeEach(() => {
      // Arrange
      const mockPipelines = {
        value: [
          mockPipelineFixtures.manualReleasePipeline1,
        ],
      };

      const mockPipelineRuns = {
        value: [
          mockPipelineRunFixtures.pipelineRun1,
        ]
      };

      const runDetailsMap = {
        1: mockPipelineRunDetailsFixtures.pipelineRun1Repo1,
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

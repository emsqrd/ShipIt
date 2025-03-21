import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock config module
const mockConfig = {
  buildDefinitionFolder: 'release',
  refresh: jest.fn(),
};

jest.unstable_mockModule('../../config/config.js', () => ({
  default: mockConfig,
}));

// Import dependencies after setting up mocks
const { default: azureDevOpsClient } = await import('../../clients/azureDevOpsClient.js');
const { clearCache, getReleasedVersions } = await import('../azureDevOpsService.js');

// Mock the azureDevOpsClient methods
jest
  .spyOn(azureDevOpsClient, 'getPipelines')
  .mockImplementation(() => Promise.resolve({ value: [] }));

jest
  .spyOn(azureDevOpsClient, 'getPipelineRuns')
  .mockImplementation(() => Promise.resolve({ value: [] }));

jest
  .spyOn(azureDevOpsClient, 'getPipelineRunDetails')
  .mockImplementation(() => Promise.resolve({}));

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
console.error = jest.fn();

describe('azureDevOpsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error.mockClear();
    clearCache();

    // Reset mock config state
    mockConfig.buildDefinitionFolder = 'release';
  });

  afterAll(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  describe('getReleasedVersions', () => {
    it('should return null when no pipelines are found', async () => {
      // Arrange
      azureDevOpsClient.getPipelines.mockResolvedValue({ value: [] });

      // Act
      const result = await getReleasedVersions('dev');

      // Assert
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('No pipelines found');
    });

    it('should return null when pipeline fetch fails', async () => {
      // Arrange
      const error = new Error('Pipeline fetch failed');

      azureDevOpsClient.getPipelines.mockImplementation(() => Promise.reject(error));

      // Act
      const result = await getReleasedVersions('dev');

      expect(result).toEqual(null);
    });

    it('should filter pipelines based on folder criteria', async () => {
      // Arrange
      const mockPipelines = {
        value: [
          { id: 1, name: 'Pipeline1', folder: 'release/valid' },
          { id: 2, name: 'Pipeline2', folder: 'release/automated' }, // should be filtered out
          { id: 3, name: 'Pipeline3', folder: 'other/invalid' }, // should be filtered out
        ],
      };

      // Need to track which pipeline IDs are used - but we need to use a mechanism that will work
      const validPipelineIds = new Set();

      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
      azureDevOpsClient.getPipelineRuns.mockImplementation((pipelineId) => {
        validPipelineIds.add(pipelineId);
        return Promise.resolve({
          value: [
            {
              id: 100 + pipelineId,
              templateParameters: { env: 'dev' },
              createdDate: '2023-01-01T12:00:00Z',
            },
          ],
        });
      });

      // Mock the pipeline details too to make the test pass all the way through
      azureDevOpsClient.getPipelineRunDetails.mockResolvedValue({
        name: 'Test Release',
        resources: {
          pipelines: {
            'ci-artifact-pipeline': {
              pipeline: {
                name: 'TestRepo',
              },
              version: '1.0.0',
            },
          },
        },
      });

      // Act
      await getReleasedVersions('dev');

      // Assert
      expect(validPipelineIds.has(1)).toBe(true);
      expect(validPipelineIds.has(2)).toBe(false);
      expect(validPipelineIds.has(3)).toBe(false);
    });

    it('should process pipeline runs and return formatted released versions', async () => {
      // Arrange
      const mockPipelines = {
        value: [{ id: 1, name: 'ReleasePipeline', folder: 'release/valid' }],
      };

      // Mock pipeline runs with environment-specific data
      const mockRuns = {
        value: [
          {
            id: 101,
            templateParameters: { env: 'dev' },
            createdDate: '2023-01-01T12:00:00Z',
          },
        ],
      };

      // Mock the run details response that will be returned
      const mockRunDetails = {
        name: 'Release 1.0.0',
        resources: {
          pipelines: {
            'ci-artifact-pipeline': {
              pipeline: { name: 'TestRepo' },
              version: '1.0.0',
            },
          },
        },
      };

      // Setup the mock implementations - make sure they actually return the values we need
      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
      azureDevOpsClient.getPipelineRuns.mockResolvedValue(mockRuns);
      azureDevOpsClient.getPipelineRunDetails.mockResolvedValue(mockRunDetails);

      // Act
      const result = await getReleasedVersions('dev');

      // Assert - The result should match our expected format
      expect(result).toEqual([
        {
          repo: 'TestRepo',
          pipelineName: 'ReleasePipeline',
          runName: 'Release 1.0.0',
          version: '1.0.0',
        },
      ]);
    });

    it('should handle errors when fetching pipeline runs', async () => {
      // Arrange
      const mockPipelines = {
        value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
      };

      const error = new Error('Failed to fetch runs');

      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
      azureDevOpsClient.getPipelineRuns.mockImplementation(() => Promise.reject(error));

      // Act
      const result = await getReleasedVersions('dev');

      // Assert
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error fetching pipeline runs:', error);
    });

    it('should handle errors when fetching pipeline run details', async () => {
      // Arrange
      const mockPipelines = {
        value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
      };

      // Mock pipeline runs
      const mockRuns = {
        value: [
          {
            id: 101,
            templateParameters: { env: 'dev' },
            createdDate: '2023-01-02T12:00:00Z',
          },
        ],
      };

      const error = new Error('Failed to fetch details');

      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
      azureDevOpsClient.getPipelineRuns.mockResolvedValue(mockRuns);
      azureDevOpsClient.getPipelineRunDetails.mockImplementation(() => Promise.reject(error));

      // Act
      const result = await getReleasedVersions('dev');

      // Assert
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error fetching pipeline run details:', error);
    });

    it('should return empty array if no valid pipeline runs exist', async () => {
      // Arrange
      const mockPipelines = {
        value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
      };

      // Empty pipeline runs
      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
      azureDevOpsClient.getPipelineRuns.mockResolvedValue({ value: [] });

      // Act
      const result = await getReleasedVersions('dev');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('cache functionality', () => {
    it('should use cached pipeline data when available', async () => {
      // Arrange
      const mockPipelines = {
        value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
      };

      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);

      // Act - First call should hit the API
      await getReleasedVersions('dev');
      // Second call should use cache
      await getReleasedVersions('dev');

      // Assert - getPipelines should only be called once
      expect(azureDevOpsClient.getPipelines).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when clearCache is called', async () => {
      // Arrange
      const mockPipelines = {
        value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
      };

      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);

      // Act - First call should hit the API
      await getReleasedVersions('dev');

      // Clear cache
      clearCache();

      // Second call should hit the API again
      await getReleasedVersions('dev');

      // Assert
      expect(azureDevOpsClient.getPipelines).toHaveBeenCalledTimes(2);
    });

    it('should expire cache after TTL period', async () => {
      // Arrange
      jest.useFakeTimers();

      const mockPipelines = {
        value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
      };

      azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);

      // Act - First call should hit the API
      await getReleasedVersions('dev');

      // Advance time beyond TTL (5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      // Second call should hit the API again due to expired cache
      await getReleasedVersions('dev');

      // Assert
      expect(azureDevOpsClient.getPipelines).toHaveBeenCalledTimes(2);

      // Clean up
      jest.useRealTimers();
    });
  });
});

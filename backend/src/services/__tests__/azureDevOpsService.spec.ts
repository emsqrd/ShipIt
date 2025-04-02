import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError } from '../../utils/errors.js';

import { ENVIRONMENT } from '../../contracts/environment.js';
import { PipelineResponse } from '../../types/AzureDevOpsTypes.js';

// Mock the module first, before any imports that might use it
jest.mock('../../clients/azureDevOpsClient.js', () => {
  return {
    __esModule: true,
    default: {
      getPipelines: jest.fn()
    }
  };
});

// Import modules after mocking
import AzureDevOpsClient from '../../clients/azureDevOpsClient.js';
import { getReleasedVersions } from '../azureDevOpsService.js';

describe('getReleasePipelines', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
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
  });
});

// // Mock config module
// const mockConfig = {
//   buildDefinitionFolder: 'release',
// };

// jest.unstable_mockModule('../../services/configService.js', () => ({
//   default: mockConfig,
// }));

// // Mock implementation
// const mockGetPipelineRuns = jest.fn<() => Promise<PipelineRunResponse>>().mockResolvedValue({ 
//   value: [] 
// });
// const mockGetPipelineRunDetails = jest.fn<() => Promise<PipelineRunDetailResponse>>().mockResolvedValue({
//   id: 0,
//   name: '',
//   pipeline: {
//     id: 0,
//     name: '',
//     folder: '',
//     url: ''
//   },
//   resources: {
//     pipelines: {}
//   }
// } as PipelineRunDetailResponse);

// // Override the imported module
// jest.mock('../../clients/azureDevOpsClient.js');

// // Import dependencies after setting up mocks
// const { clearCache, getReleasedVersions } = await import('../azureDevOpsService.js');

// // Mock console.error to prevent test output pollution
// const originalConsoleError = console.error;
// console.error = jest.fn() as jest.Mock;

// describe('azureDevOpsService', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//     (console.error as jest.Mock).mockClear();
//     clearCache();

//     // Reset mock config state
//     mockConfig.buildDefinitionFolder = 'release';

//   });

//   afterAll(() => {
//     // Restore console.error
//     console.error = originalConsoleError;
//   });

//   describe('getReleasedVersions', () => {
//     it('should throw NotFoundError when no pipelines are found', async () => {
//       // Arrange
//       jest
//         .spyOn(azureDevOpsClient as InstanceType<typeof AzureDevOpsClient>, 'getPipelines')
//         .mockResolvedValue({ value: [] });


//       await expect(azureDevOpsService['getReleasePipelines']()).rejects.toThrow(NotFoundError);
//       // Act & Assert
//       // await expect(getReleasedVersions(ENVIRONMENT.DEV)).rejects.toMatchObject({
//       //   name: 'NotFoundError',
//       //   statusCode: HttpStatusCode.NOT_FOUND,
//       //   code: ErrorCode.NOT_FOUND,
//       //   message: 'No pipelines found'
//       // });
//     });

//     it('should throw ExternalAPIError when pipeline fetch fails', async () => {
//       // Arrange
//       const error = new Error('Pipeline fetch failed');
//       azureDevOpsClient.getPipelines.mockImplementation(() => Promise.reject(error));

//       // Act & Assert
//       await expect(getReleasedVersions('dev')).rejects.toThrow();

//       // Since our implementation now wraps the error twice (once in getReleasePipelines and once in getReleasedVersions),
//       // we only need to verify that ExternalAPIError was called with the proper parameters at least once
//       expect(mockExternalAPIError).toHaveBeenCalledWith(
//         expect.stringContaining('Failed to fetch release pipelines'),
//         503,
//         'AZURE_PIPELINE_FETCH_ERROR',
//         error,
//       );
//     });

//     it('should filter pipelines based on folder criteria', async () => {
//       // Arrange
//       const mockPipelines = {
//         value: [
//           { id: 1, name: 'Pipeline1', folder: 'release/valid' },
//           { id: 2, name: 'Pipeline2', folder: 'release/automated' }, // should be filtered out
//           { id: 3, name: 'Pipeline3', folder: 'other/invalid' }, // should be filtered out
//         ],
//       };

//       // Need to track which pipeline IDs are used
//       const validPipelineIds = new Set();

//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
//       azureDevOpsClient.getPipelineRuns.mockImplementation((pipelineId) => {
//         validPipelineIds.add(pipelineId);
//         return Promise.resolve({
//           value: [
//             {
//               id: 100 + pipelineId,
//               templateParameters: { env: 'dev' },
//               createdDate: '2023-01-01T12:00:00Z',
//             },
//           ],
//         });
//       });

//       // Mock the pipeline details too to make the test pass all the way through
//       azureDevOpsClient.getPipelineRunDetails.mockResolvedValue({
//         name: 'Test Release',
//         resources: {
//           pipelines: {
//             'ci-artifact-pipeline': {
//               pipeline: {
//                 name: 'TestRepo',
//               },
//               version: '1.0.0',
//             },
//           },
//         },
//       });

//       // Act
//       await getReleasedVersions('dev');

//       // Assert
//       expect(validPipelineIds.has(1)).toBe(true);
//       expect(validPipelineIds.has(2)).toBe(false);
//       expect(validPipelineIds.has(3)).toBe(false);
//     });

//     it('should throw NotFoundError when no release pipelines match criteria', async () => {
//       // Arrange - make sure mockNotFoundError returns an error we can catch
//       const notFoundError = new Error('No release pipelines found matching the criteria');
//       notFoundError.statusCode = 404;
//       notFoundError.code = 'NOT_FOUND';

//       mockNotFoundError.mockReturnValue(notFoundError);

//       // Set up mock data that will NOT match the criteria
//       const mockPipelines = {
//         value: [
//           { id: 1, name: 'Pipeline1', folder: 'other/invalid' },
//           { id: 2, name: 'Pipeline2', folder: 'also/invalid' },
//         ],
//       };

//       // Make sure the mock correctly returns this data
//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);

//       // Set the buildDefinitionFolder to something that won't match our mock data
//       mockConfig.buildDefinitionFolder = 'release';

//       // Clear cache to ensure we don't get cached results
//       clearCache();

//       // Act & Assert
//       await expect(getReleasedVersions('dev')).rejects.toThrow(notFoundError);
//       expect(mockNotFoundError).toHaveBeenCalledWith(
//         'No release pipelines found matching the criteria',
//       );
//     });

//     it('should process pipeline runs and return formatted released versions', async () => {
//       // Arrange
//       const mockPipelines = {
//         value: [{ id: 1, name: 'ReleasePipeline', folder: 'release/valid' }],
//       };

//       // Mock pipeline runs with environment-specific data
//       const mockRuns = {
//         value: [
//           {
//             id: 101,
//             templateParameters: { env: 'dev' },
//             createdDate: '2023-01-01T12:00:00Z',
//           },
//         ],
//       };

//       // Mock the run details response that will be returned
//       const mockRunDetails = {
//         name: 'Release 1.0.0',
//         resources: {
//           pipelines: {
//             'ci-artifact-pipeline': {
//               pipeline: { name: 'TestRepo' },
//               version: '1.0.0',
//             },
//           },
//         },
//       };

//       // Setup the mock implementations - make sure they actually return the values we need
//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
//       azureDevOpsClient.getPipelineRuns.mockResolvedValue(mockRuns);
//       azureDevOpsClient.getPipelineRunDetails.mockResolvedValue(mockRunDetails);

//       // Act
//       const result = await getReleasedVersions('dev');

//       // Assert - The result should match our expected format
//       expect(result).toEqual([
//         {
//           repo: 'TestRepo',
//           pipelineName: 'ReleasePipeline',
//           runName: 'Release 1.0.0',
//           version: '1.0.0',
//         },
//       ]);
//     });

//     it('should properly handle Promise.allSettled for pipeline runs with some failures', async () => {
//       // Arrange
//       const mockPipelines = {
//         value: [
//           { id: 1, name: 'Pipeline1', folder: 'release/valid' },
//           { id: 2, name: 'Pipeline2', folder: 'release/valid' },
//         ],
//       };

//       const mockRuns = {
//         value: [
//           {
//             id: 101,
//             templateParameters: { env: 'dev' },
//             createdDate: '2023-01-01T12:00:00Z',
//           },
//         ],
//       };

//       const mockRunDetails = {
//         name: 'Release 1.0.0',
//         resources: {
//           pipelines: {
//             'ci-artifact-pipeline': {
//               pipeline: { name: 'TestRepo' },
//               version: '1.0.0',
//             },
//           },
//         },
//       };

//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);

//       // First pipeline works, second fails
//       azureDevOpsClient.getPipelineRuns
//         .mockImplementationOnce(() => Promise.resolve(mockRuns))
//         .mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch runs')));

//       azureDevOpsClient.getPipelineRunDetails.mockResolvedValue(mockRunDetails);

//       // Act
//       const result = await getReleasedVersions('dev');

//       // Assert - Should still return results for the successful pipeline
//       expect(result.length).toBe(1);
//       expect(result[0].pipelineName).toBe('Pipeline1');
//     });

//     it('should return empty array if no valid pipeline runs exist', async () => {
//       // Arrange
//       const mockPipelines = {
//         value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
//       };

//       // Empty pipeline runs
//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
//       azureDevOpsClient.getPipelineRuns.mockResolvedValue({ value: [] });

//       // Act
//       const result = await getReleasedVersions('dev');

//       // Assert
//       expect(result).toEqual([]);
//     });
//   });

//   describe('cache functionality', () => {
//     it('should use cached pipeline data when available', async () => {
//       // Arrange
//       const mockPipelines = {
//         value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
//       };

//       const mockRuns = {
//         value: [
//           {
//             id: 101,
//             templateParameters: { env: 'dev' },
//             createdDate: '2023-01-01T12:00:00Z',
//           },
//         ],
//       };

//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
//       azureDevOpsClient.getPipelineRuns.mockResolvedValue(mockRuns);
//       azureDevOpsClient.getPipelineRunDetails.mockResolvedValue({
//         name: 'Release',
//         resources: {
//           pipelines: { 'ci-artifact-pipeline': { pipeline: { name: 'Repo' }, version: '1.0' } },
//         },
//       });

//       // Act - First call should hit the API
//       await getReleasedVersions('dev');

//       // Second call should use cache
//       await getReleasedVersions('dev');

//       // Assert - getPipelines should only be called once
//       expect(azureDevOpsClient.getPipelines).toHaveBeenCalledTimes(1);
//     });

//     it('should clear cache when clearCache is called', async () => {
//       // Arrange
//       const mockPipelines = {
//         value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
//       };

//       const mockRuns = {
//         value: [
//           {
//             id: 101,
//             templateParameters: { env: 'dev' },
//             createdDate: '2023-01-01T12:00:00Z',
//           },
//         ],
//       };

//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
//       azureDevOpsClient.getPipelineRuns.mockResolvedValue(mockRuns);
//       azureDevOpsClient.getPipelineRunDetails.mockResolvedValue({
//         name: 'Release',
//         resources: {
//           pipelines: { 'ci-artifact-pipeline': { pipeline: { name: 'Repo' }, version: '1.0' } },
//         },
//       });

//       // Act - First call should hit the API
//       await getReleasedVersions('dev');

//       // Clear cache
//       clearCache();

//       // Second call should hit the API again
//       await getReleasedVersions('dev');

//       // Assert
//       expect(azureDevOpsClient.getPipelines).toHaveBeenCalledTimes(2);
//     });

//     it('should expire cache after TTL period', async () => {
//       // Arrange
//       jest.useFakeTimers();

//       const mockPipelines = {
//         value: [{ id: 1, name: 'Pipeline1', folder: 'release/valid' }],
//       };

//       const mockRuns = {
//         value: [
//           {
//             id: 101,
//             templateParameters: { env: 'dev' },
//             createdDate: '2023-01-01T12:00:00Z',
//           },
//         ],
//       };

//       azureDevOpsClient.getPipelines.mockResolvedValue(mockPipelines);
//       azureDevOpsClient.getPipelineRuns.mockResolvedValue(mockRuns);
//       azureDevOpsClient.getPipelineRunDetails.mockResolvedValue({
//         name: 'Release',
//         resources: {
//           pipelines: { 'ci-artifact-pipeline': { pipeline: { name: 'Repo' }, version: '1.0' } },
//         },
//       });

//       // Act - First call should hit the API
//       await getReleasedVersions('dev');

//       // Advance time beyond TTL (5 minutes)
//       jest.advanceTimersByTime(6 * 60 * 1000);

//       // Second call should hit the API again due to expired cache
//       await getReleasedVersions('dev');

//       // Assert
//       expect(azureDevOpsClient.getPipelines).toHaveBeenCalledTimes(2);

//       // Clean up
//       jest.useRealTimers();
//     });
//   });
// });

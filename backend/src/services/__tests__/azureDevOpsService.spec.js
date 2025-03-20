import azureDevOpsClient from '../../clients/azureDevOpsClient.js';
import { clearCache, getReleasedVersions } from '../azureDevOpsService.js';

// Mock dependencies
jest.mock('../../clients/azureDevOpsClient.js');

describe('azureDevOpsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  describe('getReleasedVersions', () => {
    it('should return empty array when no pipelines are found', async () => {
      // Arrange
      azureDevOpsClient.getPipelines.mockResolvedValue({ value: [] });

      // Act
      const result = await getReleasedVersions('dev');

      // Assert
      expect(result).toEqual([]);
      expect(azureDevOpsClient.getPipelines).toHaveBeenCalledTimes(1);
    });
  });
});

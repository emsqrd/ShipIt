import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReleasedVersion } from '../contracts/ReleasedVersion';
import { fetchReleasedVersions } from './releasedVersionsService';

// Constants matching implementation
const API_BASE_URL = import.meta.env.VITE_SHIP_IT_API_URL;

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('releasedVersionsService', () => {
  const mockReleasedVersions: ReleasedVersion[] = [
    {
      repo: 'repo1',
      pipelineName: 'pipeline1',
      runName: 'run1',
      version: '1.0.0',
    },
    {
      repo: 'repo2',
      pipelineName: 'pipeline2',
      runName: 'run2',
      version: '2.0.0',
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchReleasedVersions', () => {
    const buildUrl = (environment: string) =>
      `${API_BASE_URL}/azure/releasedVersions?environment=${encodeURIComponent(environment)}`;

    it('should fetch released versions successfully', async () => {
      // Arrange
      const environment = 'dev';
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockReleasedVersions),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // Act
      const result = await fetchReleasedVersions(environment);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(buildUrl(environment));
      expect(mockResponse.json).toHaveBeenCalled();
      expect(result).toEqual(mockReleasedVersions);
    });

    it('should throw error when response is not ok', async () => {
      // Arrange
      const environment = 'prod';
      const errorStatus = 404;
      const mockResponse = {
        ok: false,
        status: errorStatus,
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // Act & Assert
      await expect(fetchReleasedVersions(environment)).rejects.toThrow(
        `Error fetching released versions: ${errorStatus}`,
      );
      expect(mockFetch).toHaveBeenCalledWith(buildUrl(environment));
    });

    it('should log and re-throw network errors', async () => {
      // Arrange
      const environment = 'test';
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      // Act & Assert
      await expect(fetchReleasedVersions(environment)).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledWith(buildUrl(environment));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching released versions:',
        networkError,
      );
    });

    it('should properly encode URI parameters', async () => {
      // Arrange
      const environment = 'special env&name';
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // Act
      await fetchReleasedVersions(environment);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(buildUrl(environment));
      // This implicitly tests that encodeURIComponent is used correctly
    });

    it('should handle empty response data', async () => {
      // Arrange
      const environment = 'empty';
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // Act
      const result = await fetchReleasedVersions(environment);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle malformed JSON response', async () => {
      // Arrange
      const environment = 'dev';
      const jsonError = new Error('Invalid JSON');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(jsonError),
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // Act & Assert
      await expect(fetchReleasedVersions(environment)).rejects.toThrow('Invalid JSON');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching released versions:', jsonError);
    });
  });
});

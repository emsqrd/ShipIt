import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import HttpMethod from '../../contracts/httpMethod.js';

// Mock ExternalAPIError class
const mockExternalAPIError = jest.fn();
jest.unstable_mockModule('../../utils/errors.js', () => ({
  ExternalAPIError: mockExternalAPIError,
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock config module
const mockConfig = {
  azureBaseUrl: 'https://dev.azure.com/test',
  azurePat: 'test-pat',
};

jest.unstable_mockModule('../../config/config.js', () => ({
  default: mockConfig,
}));

// Import after mocks are set up
const { AzureDevOpsClient } = await import('../azureDevOpsClient.js');

describe('AzureDevOpsClient', () => {
  let client;

  beforeEach(() => {
    client = new AzureDevOpsClient();
    jest.clearAllMocks();

    // Setup ExternalAPIError mock implementation
    mockExternalAPIError.mockImplementation((message, statusCode, code, originalError) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.code = code;
      error.originalError = originalError;
      return error;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should use default baseUrl from config when not provided', () => {
      expect(client.baseUrl).toBe(mockConfig.azureBaseUrl);
    });

    it('should use custom baseUrl when provided', () => {
      const customUrl = 'https://custom.azure.com';
      const customClient = new AzureDevOpsClient(customUrl);
      expect(customClient.baseUrl).toBe(customUrl);
    });
  });

  describe('API methods', () => {
    const mockSuccessResponse = { data: 'test' };
    const defaultHeaders = {
      Authorization: `Basic ${mockConfig.azurePat}`,
      'Content-Type': 'application/json',
    };

    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });
    });

    describe('getPipelines', () => {
      it('should call fetch with correct URL and method', async () => {
        await client.getPipelines();

        expect(fetch).toHaveBeenCalledWith(
          `${mockConfig.azureBaseUrl}/pipelines?api-version=7.1`,
          expect.objectContaining({
            method: HttpMethod.GET,
            headers: defaultHeaders,
          }),
        );
      });

      it('should return parsed JSON response', async () => {
        const result = await client.getPipelines();
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe('getPipelineRuns', () => {
      const pipelineId = '123';

      it('should call fetch with correct URL and method', async () => {
        await client.getPipelineRuns(pipelineId);

        expect(fetch).toHaveBeenCalledWith(
          `${mockConfig.azureBaseUrl}/pipelines/${pipelineId}/runs?api-version=7.1`,
          expect.objectContaining({
            method: HttpMethod.GET,
            headers: defaultHeaders,
          }),
        );
      });

      it('should return parsed JSON response', async () => {
        const result = await client.getPipelineRuns(pipelineId);
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe('getPipelineRunDetails', () => {
      const pipelineId = '123';
      const runId = '456';

      it('should call fetch with correct URL and method', async () => {
        await client.getPipelineRunDetails(pipelineId, runId);

        expect(fetch).toHaveBeenCalledWith(
          `${mockConfig.azureBaseUrl}/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`,
          expect.objectContaining({
            method: HttpMethod.GET,
            headers: defaultHeaders,
          }),
        );
      });

      it('should return parsed JSON response', async () => {
        const result = await client.getPipelineRunDetails(pipelineId, runId);
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe('error handling', () => {
      it('should throw ExternalAPIError when response is not ok', async () => {
        const errorStatus = 404;
        const errorText = 'Not Found';

        global.fetch.mockResolvedValue({
          ok: false,
          status: errorStatus,
          statusText: errorText,
          text: () => Promise.resolve('Resource not found'),
        });

        await expect(client.getPipelines()).rejects.toThrow();
        expect(mockExternalAPIError).toHaveBeenCalledWith(
          expect.stringContaining(`Azure DevOps API error: ${errorStatus}`),
          errorStatus,
          'AZURE_API_ERROR',
          expect.any(Object),
        );
      });

      it('should handle network errors with ExternalAPIError', async () => {
        const networkError = new Error('Network error');
        global.fetch.mockRejectedValue(networkError);

        await expect(client.getPipelines()).rejects.toThrow();
        expect(mockExternalAPIError).toHaveBeenCalledWith(
          expect.stringContaining('Azure DevOps API request failed'),
          503,
          'AZURE_CONNECTION_ERROR',
          networkError,
        );
      });
    });
  });
});

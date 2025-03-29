const mockConfig = {
  azureBaseUrl: 'https://dev.azure.com/test',
  azurePat: 'test-pat',
};

// Mock the config service immediately
jest.mock('../../services/configService.js', () => mockConfig, { virtual: true });

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  xit
} from '@jest/globals';
import { HttpMethod } from '../../contracts/httpMethod.js';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Import the client AFTER the mocks are set up
import { AzureDevOpsClient } from '../azureDevOpsClient.js';

// Helper function to create mock responses
function createMockResponse(options: {
  ok: boolean;
  status?: number;
  statusText?: string;
  data?: unknown;
  text?: string;
}): Response {
  const { ok, status = 200, statusText = 'OK', data, text } = options;

  return {
    ok,
    status,
    statusText,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(text || ''),
    headers: new Headers(),
  } as unknown as Response;
}

describe('AzureDevOpsClient', () => {
  let client: AzureDevOpsClient;

  const mockSuccessResponse = { data: 'test' };

  beforeEach(() => {
    client = new AzureDevOpsClient();
    jest.clearAllMocks();

    // Use the helper function for mock response
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: true,
        data: mockSuccessResponse,
      }),
    );
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
      // Use the helper function for mock response
      mockFetch.mockResolvedValue(
        createMockResponse({
          ok: true,
          data: mockSuccessResponse,
        }),
      );
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
      const pipelineId = 123;

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
      const pipelineId = 123;
      const runId = 456;

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

        // Use the helper function for error response
        mockFetch.mockResolvedValue(
          createMockResponse({
            ok: false,
            status: errorStatus,
            statusText: errorText,
            text: 'Resource not found',
          }),
        );

        await expect(client.getPipelines()).rejects.toMatchObject({
          name: 'ExternalAPIError',
          statusCode: errorStatus,
          code: 'AZURE_API_ERROR',
          message: expect.stringContaining(
            `Azure DevOps API error: ${errorStatus} - Resource not found`,
          ),
        });
      });

      xit('should handle network errors with ExternalAPIError', async () => {
        const networkError = new Error('Network error');
        mockFetch.mockRejectedValue(networkError);

        await expect(client.getPipelines()).rejects.toThrow();
      });
    });
  });
});

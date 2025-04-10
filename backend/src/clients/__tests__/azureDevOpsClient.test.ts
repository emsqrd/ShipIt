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
  jest
} from '@jest/globals';
import { HttpMethod } from '../../enums/httpMethod';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Import the client AFTER the mocks are set up
import { ErrorCode } from '../../enums/errorCode';
import { HttpStatusCode } from '../../enums/httpStatusCode';
import { AzureDevOpsClient } from '../azureDevOpsClient';

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
        const errorStatus = HttpStatusCode.NOT_FOUND;
        const errorText = ErrorCode.NOT_FOUND;

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
          code: ErrorCode.AZURE_API_ERROR,
          message: expect.stringContaining(
            `Azure DevOps API error: ${errorStatus} - Resource not found`,
          ),
        });
      });

      it('should use fallback error text when response.text() fails', async () => {
        const errorStatus = HttpStatusCode.NOT_FOUND;
        const errorText = ErrorCode.NOT_FOUND;
        
        // Create a mock response where the text() method throws an error
        const textMock = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('Failed to read response body'));
        
        const mockResponse = createMockResponse({
          ok: false,
          status: errorStatus,
          statusText: errorText,
          text: 'Resource Not Found',
        });

        mockResponse.text = textMock;

        // Use the helper function for error response
        mockFetch.mockResolvedValue(mockResponse);

        await expect(client.getPipelines()).rejects.toMatchObject({
          name: 'ExternalAPIError',
          statusCode: errorStatus,
          code: ErrorCode.AZURE_API_ERROR,
          message: expect.stringContaining('No error details available'),
        });
      });

      it('should handle network errors with ExternalAPIError', async () => {
        const errorMessage = 'Network error';

        const networkError = new Error(errorMessage);
        mockFetch.mockRejectedValue(networkError);

        await expect(client.getPipelines()).rejects.toMatchObject({
          name: 'ExternalAPIError',
          statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
          code: ErrorCode.AZURE_CONNECTION_ERROR,
          message: expect.stringContaining(errorMessage),
        });
      });

      it('should handle non-Error objects with "Unknown error" message', async () => {
        // Mock fetch to throw a non-Error object
        mockFetch.mockImplementationOnce(() => {
          // This will trigger the condition where error is not an instance of Error
          throw { someProperty: 'This is not an Error object' };
        });
      
        await expect(client.getPipelines()).rejects.toMatchObject({
          name: 'ExternalAPIError',
          statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
          code: ErrorCode.AZURE_CONNECTION_ERROR,
          message: expect.stringContaining('Azure DevOps API request failed: Unknown error'),
        });
      });

    });
  });
});

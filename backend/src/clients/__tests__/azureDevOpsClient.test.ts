const mockConfig = {
  AZURE_BASE_URL: 'https://dev.azure.com/test',
  AZURE_PAT: 'test-pat',
};

// Mock the config immediately
jest.mock('../../app.js', () => ({
  __esModule: true,
  config: mockConfig,
}));

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
import { PipelineResponse, PipelineRunResponse } from '../../types/AzureDevOpsTypes';
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

  beforeEach(() => {
    client = new AzureDevOpsClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('API methods', () => {
    const defaultHeaders = {
      Authorization: `Basic ${mockConfig.AZURE_PAT}`,
      'Content-Type': 'application/json',
    };

    describe('getPipelines', () => {
      const mockPipelineResponse: PipelineResponse = {
        value: [{
          id: 1,
          name: 'pipeline',
          folder: 'release',
        }]
      };

      beforeEach(() => {
        mockFetch.mockResolvedValue(
          createMockResponse({
            ok: true,
            data: mockPipelineResponse,
          }),
        );
      });

      it('should call fetch with correct URL and method', async () => {
        await client.getPipelines();

        expect(fetch).toHaveBeenCalledWith(
          `${mockConfig.AZURE_BASE_URL}/pipelines?api-version=7.1`,
          expect.objectContaining({
            method: HttpMethod.GET,
            headers: defaultHeaders,
          }),
        );
      });

      it('should return PipelineResponse', async () => {
        const result = await client.getPipelines();
        expect(result).toEqual(mockPipelineResponse);
      });
    });

    describe('getPipelineRuns', () => {
      const pipelineId = 123;
      const mockPipelineRunResponse: PipelineRunResponse = {
        value: [{
          id: 1,
          name: 'Pipeline Run 1',
          templateParameters: {
              env: 'uat',
          },
          createdDate: '06/16/2012',
        }],
      };

      beforeEach(() => {
        mockFetch.mockResolvedValue(
          createMockResponse({
            ok: true,
            data: mockPipelineRunResponse,
          }),
        );
      });

      it('should call fetch with correct URL and method', async () => {
        await client.getPipelineRuns(pipelineId);

        expect(fetch).toHaveBeenCalledWith(
          `${mockConfig.AZURE_BASE_URL}/pipelines/${pipelineId}/runs?api-version=7.1`,
          expect.objectContaining({
            method: HttpMethod.GET,
            headers: defaultHeaders,
          }),
        );
      });

      it('should return PipelineRunResponse', async () => {
        const result = await client.getPipelineRuns(pipelineId);
        expect(result).toEqual(mockPipelineRunResponse);
      });
    });

    describe('getPipelineRunDetails', () => {
      const pipelineId = 123;
      const runId = 456;

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

      beforeEach(() => {
        mockFetch.mockResolvedValue(
          createMockResponse({
            ok: true,
            data: mockPipelineRunDetailsResponse,
          }),
        );
      });

      it('should call fetch with correct URL and method', async () => {
        await client.getPipelineRunDetails(pipelineId, runId);

        expect(fetch).toHaveBeenCalledWith(
          `${mockConfig.AZURE_BASE_URL}/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`,
          expect.objectContaining({
            method: HttpMethod.GET,
            headers: defaultHeaders,
          }),
        );
      });

      it('should return PipelineRunDetailResponse', async () => {
        const result = await client.getPipelineRunDetails(pipelineId, runId);
        expect(result).toEqual(mockPipelineRunDetailsResponse);
      });
    });

    describe('getBuildTimeline', () => {
      const buildId = 123;
      const mockTimelineResponse = {
        records: [
          {
            id: "100",
            parentId: "1",
            type: "Stage",
            name: "EnvDeploy",
            state: "completed",
            result: "succeeded"
          }
        ],
      };

      beforeEach(() => {
        mockFetch.mockResolvedValue(
          createMockResponse({
            ok: true,
            data: mockTimelineResponse,
          }),
        );
      });

      it('should call fetch with correct URL and method', async() => {
        await client.getBuildTimeline(buildId);

        expect(fetch).toHaveBeenCalledWith(
          `${mockConfig.AZURE_BASE_URL}/build/builds/${buildId}/timeline?api-version=7.1`,
          expect.objectContaining({
            method: HttpMethod.GET,
            headers: defaultHeaders,
          }),
        );
      });

      it('should return parsed JSON response', async () => {
        const result = await client.getBuildTimeline(buildId);
        expect(result).toEqual(mockTimelineResponse);
      })
    })

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

import { ErrorCode } from '../enums/ErrorCode.js';
import { HttpMethod } from '../enums/HttpMethod.js';
import { HttpStatusCode } from '../enums/HttpStatusCode.js';
import config from '../services/configService.js';
import {
  PipelineResponse,
  PipelineRunDetailResponse,
  PipelineRunResponse,
} from '../types/AzureDevOpsTypes.js';
import { ExternalAPIError } from '../utils/errors.js';

const AZURE_API_VERSION = 'api-version=7.1';

export class AzureDevOpsClient {
  public baseUrl: string | undefined;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.azureBaseUrl;
  }

  //TODO: Move this to a base class when implementing JiraClient
  async #fetchApi(method: HttpMethod, url: string) {
    type FetchOptions = Parameters<typeof fetch>[1];

    const options: FetchOptions = {
      method,
      headers: {
        Authorization: `Basic ${config.azurePat}`,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new ExternalAPIError(
          `Azure DevOps API error: ${response.status} - ${errorText}`,
          response.status,
          ErrorCode.AZURE_API_ERROR,
        );
      }

      return response.json();
    } catch (error: unknown) {
      // If this is already our custom error, rethrow it
      if (error instanceof ExternalAPIError) {
        throw error;
      }

      // If it's a network error or other fetch related error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ExternalAPIError(
        `Azure DevOps API request failed: ${errorMessage}`,
        HttpStatusCode.SERVICE_UNAVAILABLE,
        ErrorCode.AZURE_CONNECTION_ERROR,
        undefined,
      );
    }
  }

  // API URL methods
  #getPipelinesUrl() {
    return `${this.baseUrl}/pipelines?${AZURE_API_VERSION}`;
  }

  #getPipelineRunsUrl(pipelineId: number) {
    return `${this.baseUrl}/pipelines/${pipelineId}/runs?${AZURE_API_VERSION}`;
  }

  #getPipelineRunDetailsUrl(pipelineId: number, runId: number) {
    return `${this.baseUrl}/pipelines/${pipelineId}/runs/${runId}?${AZURE_API_VERSION}`;
  }

  // API Calling methods
  async getPipelines(): Promise<PipelineResponse> {
    return await this.#fetchApi(HttpMethod.GET, this.#getPipelinesUrl());
  }

  async getPipelineRuns(pipelineId: number): Promise<PipelineRunResponse> {
    return await this.#fetchApi(HttpMethod.GET, this.#getPipelineRunsUrl(pipelineId));
  }

  async getPipelineRunDetails(
    pipelineId: number,
    runId: number,
  ): Promise<PipelineRunDetailResponse> {
    const response = await this.#fetchApi(
      HttpMethod.GET,
      this.#getPipelineRunDetailsUrl(pipelineId, runId),
    );
    return response;
  }
}

export default new AzureDevOpsClient();

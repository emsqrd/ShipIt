import { config } from '../app.js';
import { ErrorCode } from '../enums/errorCode.js';
import { HttpMethod } from '../enums/httpMethod.js';
import { HttpStatusCode } from '../enums/httpStatusCode.js';
import {
  BuildTimelineResponse,
  PipelineResponse,
  PipelineRunDetailResponse,
  PipelineRunResponse,
} from '../types/AzureDevOpsTypes.js';
import { ExternalAPIError } from '../utils/errors.js';

const AZURE_API_VERSION = 'api-version=7.1';

export class AzureDevOpsClient {
  private get baseUrl() {
    return config.AZURE_BASE_URL;
  }

  //TODO: Move this to a base class when implementing JiraClient
  async #fetchApi(method: HttpMethod, url: string) {
    type FetchOptions = Parameters<typeof fetch>[1];

    const fullUrl = `${this.baseUrl}${url}`;
    const options: FetchOptions = {
      method,
      headers: {
        Authorization: `Basic ${config.AZURE_PAT}`,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(fullUrl, options);

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
    return `/pipelines?${AZURE_API_VERSION}`;
  }

  #getPipelineRunsUrl(pipelineId: number) {
    return `/pipelines/${pipelineId}/runs?${AZURE_API_VERSION}`;
  }

  #getPipelineRunDetailsUrl(pipelineId: number, runId: number) {
    return `/pipelines/${pipelineId}/runs/${runId}?${AZURE_API_VERSION}`;
  }

  #getBuildTimelineUrl(buildId: number) {
    return `/build/builds/${buildId}/timeline?${AZURE_API_VERSION}`;
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
    return await this.#fetchApi(HttpMethod.GET, this.#getPipelineRunDetailsUrl(pipelineId, runId));
  }

  async getBuildTimeline(buildId: number): Promise<BuildTimelineResponse> {
    return await this.#fetchApi(HttpMethod.GET, this.#getBuildTimelineUrl(buildId));
  }
}

export default new AzureDevOpsClient();

import HttpMethod from '../contracts/httpMethod.js';

const azureBaseUrl = process.env.AZURE_BASE_URL;
const AZURE_API_VERSION = 'api-version=7.1';

class AzureDevOpsClient {
  constructor(baseUrl = azureBaseUrl) {
    this.baseUrl = baseUrl;
  }

  //TODO: Move this to a base class when implementing JiraClient
  async #fetchApi(method, url, body = null) {
    const options = {
      method,
      headers: {
        Authorization: `Basic ${process.env.AZURE_PAT}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new Error(`Azure DevOps API error: ${response.status}`);
      error.response = response;
      throw error;
    }

    return response.json();
  }

  // API URL methods
  #getPipelinesUrl() {
    return `${this.baseUrl}/pipelines?${AZURE_API_VERSION}`;
  }

  #getPipelineRunsUrl(pipelineId) {
    return `${this.baseUrl}/pipelines/${pipelineId}/runs?${AZURE_API_VERSION}`;
  }

  #getPipelineRunDetailsUrl(pipelineId, runId) {
    return `${this.baseUrl}/pipelines/${pipelineId}/runs/${runId}?${AZURE_API_VERSION}`;
  }

  // API Calling methods
  async getPipelines() {
    return this.#fetchApi(HttpMethod.GET, this.#getPipelinesUrl());
  }

  async getPipelineRuns(pipelineId) {
    return this.#fetchApi(HttpMethod.GET, this.#getPipelineRunsUrl(pipelineId));
  }

  async getPipelineRunDetails(pipelineId, runId) {
    return this.#fetchApi(HttpMethod.GET, this.#getPipelineRunDetailsUrl(pipelineId, runId));
  }
}

export default new AzureDevOpsClient();

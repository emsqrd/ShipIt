const azureBaseUrl = process.env.AZURE_BASE_URL;

const AZURE_API_VERSION = 'api-version=7.1';
const AZURE_HEADERS = {
  headers: {
    Authorization: `Basic ${process.env.AZURE_PAT}`,
  },
};

class AzureDevOpsClient {
  constructor(baseUrl = azureBaseUrl, headers = AZURE_HEADERS) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  async #fetchApi(url) {
    const response = await fetch(url, this.headers);

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
    return this.#fetchApi(this.#getPipelinesUrl());
  }

  async getPipelineRuns(pipelineId) {
    return this.#fetchApi(this.#getPipelineRunsUrl(pipelineId));
  }

  async getPipelineRunDetails(pipelineId, runId) {
    return this.#fetchApi(this.#getPipelineRunDetailsUrl(pipelineId, runId));
  }
}

export default new AzureDevOpsClient();

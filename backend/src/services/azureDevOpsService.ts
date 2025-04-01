import azureDevOpsClient from '../clients/azureDevOpsClient.js';
import { ENVIRONMENT } from '../contracts/environment.js';
import { Pipeline, PipelineRun, ReleasedVersion } from '../types/AzureDevOpsTypes.js';
import { ErrorCode } from '../types/ErrorCode.js';
import { HttpStatusCode } from '../types/HttpStatusCode.js';
import {
  AppError,
  ExternalAPIError,
  NotFoundError,
  getErrorMessage,
  getErrorStatusCode,
} from '../utils/errors.js';
import config from './configService.js';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = new Map();

// Simple cache helper functions
function getCachedData<T>(key: string): T | null {
  const cachedItem = cache.get(key);
  if (!cachedItem) return null;

  // Check if cache is still valid
  if (Date.now() > cachedItem.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cachedItem.data;
}

function setCachedData<T>(key: string, data: T, ttl = CACHE_TTL): T {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
  return data;
}

// Utility function to clear the cache (can be exposed if needed)
export function clearCache(keyPattern = null) {
  if (keyPattern) {
    // Clear specific cache entries matching the pattern
    for (const key of cache.keys()) {
      if (key.includes(keyPattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all cache
    cache.clear();
  }
}

// Fetch Pipeline Data from Azure DevOps API
async function getPipelines(): Promise<Pipeline[]> {
  const cacheKey = 'pipelines';
  const cachedPipelines = getCachedData<Pipeline[]>(cacheKey);
  if (cachedPipelines) return cachedPipelines;

  try {
    const response = await azureDevOpsClient.getPipelines();

    const result: Pipeline[] = response.value.map((response) => ({
      id: response.id,
      name: response.name,
      folder: response.folder,
    }));

    return setCachedData<Pipeline[]>(cacheKey, result);
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    throw new ExternalAPIError(
      `Failed to fetch release pipelines: ${getErrorMessage(error)}`,
      getErrorStatusCode(error) || HttpStatusCode.SERVICE_UNAVAILABLE,
      ErrorCode.AZURE_PIPELINE_FETCH_ERROR,
      error,
    );
  }
}

async function getReleasePipelines(): Promise<Pipeline[]> {
  const pipelines = await getPipelines();

  if (!pipelines?.length) {
    throw new NotFoundError('No pipelines found');
  }

  const releasePipelines = pipelines.filter(
    (pipeline) =>
      pipeline.folder.includes(config.buildDefinitionFolder) &&
      !pipeline.folder.toLowerCase().includes('automated'), //todo: probably remove this at some point to get int releases
  );

  if (releasePipelines.length === 0) {
    throw new NotFoundError('No release pipelines found matching the criteria');
  }

  return releasePipelines;
}

// Fetch all runs for one pipeline in a single batch
async function getReleasePipelineRunsByEnvironment(
  pipelineId: number,
  environment: ENVIRONMENT,
): Promise<PipelineRun[]> {
  const pipelineRuns = (await azureDevOpsClient.getPipelineRuns(pipelineId)).value?.filter(
    (run) => run.templateParameters?.env === environment,
  );

  // Map the runs to prepare an array of all the detail fetch promises
  const detailPromises = pipelineRuns.map(async (run) => {
    return await azureDevOpsClient.getPipelineRunDetails(run.pipeline.id, run.id);
  });

  // Execute all detail requests in parallel
  const details = await Promise.all(detailPromises);

  // Now combine the run data with the detailed data
  return pipelineRuns
    .map((run, index) => {
      const detail = details[index];

      const ciArtifactPipeline = detail?.resources?.pipelines?.['ci-artifact-pipeline'];

      return {
        id: run.id,
        name: run.name,
        environment: run.templateParameters?.env,
        createdDate: run.createdDate,
        pipeline: {
          id: run.pipeline?.id,
          name: run.pipeline?.name,
          folder: run.pipeline?.folder,
        },
        pipelineRunDetail: {
          id: detail.id,
          name: detail.name,
          repo: ciArtifactPipeline?.pipeline?.name,
          version: ciArtifactPipeline?.version,
        },
      };
    })
    .filter((envPipeline) => envPipeline.environment === environment);
}

// Gets all pipeline runs for all pipelines
async function getAllPipelineRunsByEnvironment(
  releasePipelines: Pipeline[],
  environment: ENVIRONMENT,
): Promise<PipelineRun[]> {
  // Fetch all pipeline runs for all pipelines in parallel
  const allRunsPromises = releasePipelines.map((pipeline) =>
    getReleasePipelineRunsByEnvironment(pipeline.id, environment),
  );

  // Wait for all pipeline run requests to complete
  const allPipelineRuns = await Promise.all(allRunsPromises);

  // Process the results - get the most recent run for each pipeline that has valid runs
  return allPipelineRuns
    .filter((runs) => runs && runs.length > 0)
    .map((runs) => {
      // Sort runs by date and take the most recent
      return runs.sort(
        (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime(),
      )[0];
    });
}

// Get all released versions for a specific environment
export async function getReleasedVersions(environment: ENVIRONMENT): Promise<ReleasedVersion[]> {
  try {
    // Get all release pipelines
    const releasePipelines = await getReleasePipelines();

    // Get all pipeline runs in parallel
    const validPipelineRuns = await getAllPipelineRunsByEnvironment(releasePipelines, environment);

    // Map the results into the final format
    const releasedVersions: ReleasedVersion[] = validPipelineRuns.map((pipelineRun) => ({
      repo: pipelineRun.pipelineRunDetail.repo,
      pipelineName: pipelineRun.pipeline.name,
      runName: pipelineRun.name,
      version: pipelineRun.pipelineRunDetail.version,
    }));

    return releasedVersions.filter(Boolean);
  } catch (error) {
    // If it's already one of our application errors, rethrow it
    if (error instanceof AppError) {
      throw error;
    }

    // Otherwise, wrap in a general error
    console.error('Error fetching released versions:', error);
    throw new ExternalAPIError(
      `Failed to fetch released versions for environment ${environment}: ${getErrorMessage(error)}`,
      HttpStatusCode.SERVICE_UNAVAILABLE,
      ErrorCode.AZURE_ENVIRONMENT_RUNS_ERROR,
      error,
    );
  }
}

export default {
  getReleasedVersions,
  clearCache,
};

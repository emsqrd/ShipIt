import azureDevOpsClient from '../clients/azureDevOpsClient.js';
import { ENVIRONMENT } from '../enums/Environment.js';
import { ErrorCode } from '../enums/ErrorCode.js';
import { HttpStatusCode } from '../enums/HttpStatusCode.js';
import { Pipeline, PipelineRun, ReleasedVersion } from '../types/AzureDevOpsTypes.js';
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
    (pipeline) => pipeline.folder === config.buildDefinitionFolder,
  );

  if (releasePipelines.length === 0) {
    throw new NotFoundError('No release pipelines found matching the criteria');
  }

  return releasePipelines;
}

// Fetch all runs for one pipeline in a single batch
async function getMostRecentReleasePipelineRunByEnvironment(
  pipelineId: number,
  environment: ENVIRONMENT,
): Promise<PipelineRun | null> {
  // Get the most recent run for the environment
  const mostRecentPipelineRun = (await azureDevOpsClient.getPipelineRuns(pipelineId)).value
    ?.filter((run) => run.templateParameters?.env === environment)
    .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())[0];

  if (!mostRecentPipelineRun) {
    return null;
  }

  const pipelineRunDetails = await azureDevOpsClient.getPipelineRunDetails(
    mostRecentPipelineRun.pipeline.id,
    mostRecentPipelineRun.id,
  );

  const ciArtifactPipeline = pipelineRunDetails?.resources?.pipelines?.['ci-artifact-pipeline'];

  // We only want pipeline runs that link back to CI Pipelines
  if (!ciArtifactPipeline) {
    return null;
  }

  // Now combine the run data with the detailed data
  return {
    id: mostRecentPipelineRun.id,
    name: mostRecentPipelineRun.name,
    environment: mostRecentPipelineRun.templateParameters?.env,
    createdDate: mostRecentPipelineRun.createdDate,
    pipeline: {
      id: mostRecentPipelineRun.pipeline?.id,
      name: mostRecentPipelineRun.pipeline?.name,
      folder: mostRecentPipelineRun.pipeline?.folder,
    },
    pipelineRunDetail: {
      id: pipelineRunDetails.id,
      name: pipelineRunDetails.name,
      repo: ciArtifactPipeline?.pipeline?.name,
      version: ciArtifactPipeline?.version,
    },
  };
}

// Get all released versions for a specific environment
export async function getReleasedVersions(environment: ENVIRONMENT): Promise<ReleasedVersion[]> {
  try {
    // Get all release pipelines
    const releasePipelines = await getReleasePipelines();

    const validPipelineRunPromises = releasePipelines.map(async (pipeline) => {
      return await getMostRecentReleasePipelineRunByEnvironment(pipeline.id, environment);
    });

    // Wait for all promises to resolve
    const validPipelineRuns = await Promise.all(validPipelineRunPromises);

    // Map the results into the final format
    const releasedVersions: ReleasedVersion[] = validPipelineRuns
      .filter((pipelineRun) => pipelineRun !== null)
      .map((pipelineRun) => ({
        repo: pipelineRun.pipelineRunDetail.repo,
        pipelineId: pipelineRun.pipeline.id,
        pipelineName: pipelineRun.pipeline.name,
        runId: pipelineRun.id,
        runName: pipelineRun.name,
        version: pipelineRun.pipelineRunDetail.version,
      }));

    return releasedVersions;
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

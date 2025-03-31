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

async function getEnrichedPipelineRuns(pipelineId: number): Promise<PipelineRun[]> {
  const pipelineRuns = await azureDevOpsClient.getPipelineRuns(pipelineId);

  const pipelineRunDetails = pipelineRuns.value.map(
    async (run) =>
      await azureDevOpsClient
        .getPipelineRunDetails(run.pipeline.id, run.id)
        .then((detail) => ({
          id: run.id,
          name: run.name,
          environment: run.templateParameters.env,
          createdDate: run.createdDate,
          pipeline: {
            id: run.pipeline.id,
            name: run.pipeline.name,
            folder: run.pipeline.folder,
          },
          pipelineRunDetail: {
            id: detail.id,
            name: detail.name,
            repo: detail.resources.pipelines['ci-artifact-pipeline'].pipeline.name,
            version: detail.resources.pipelines['ci-artifact-pipeline'].version,
          },
        }))
        .catch((error) => {
          console.error(`Error fetching details for pipeline ${pipelineId}, run ${run.id}:`, error);
          throw new ExternalAPIError(
            `Failed to fetch pipeline run details for pipeline ${pipelineId}, run ${run.id}: ${getErrorMessage(error)}`,
            getErrorStatusCode(error) || HttpStatusCode.SERVICE_UNAVAILABLE,
            ErrorCode.AZURE_PIPELINE_RUN_DETAILS_ERROR,
            error,
          );
        }),
  );

  return Promise.all(pipelineRunDetails);
}

// async function getPipelineRuns(pipelineId: number): Promise<PipelineRun[]> {
//   try {
//     const response = await azureDevOpsClient.getPipelineRuns(pipelineId);

//     const result: PipelineRun[] = response.map((response) => ({
//       id: response.value.id,
//       name: response.value.name,
//       environment: response.value.templateParameters.env,
//       createdDate: response.value.createdDate,
//       pipeline: {
//         id: response.value.pipeline.value.id,
//         name: response.value.pipeline.value.name,
//         folder: response.value.pipeline.value.folder,
//       },
//     }));

//     return result;
//   } catch (error) {
//     console.error(`Error fetching pipeline runs for pipeline ${pipelineId}:`, error);
//     throw new ExternalAPIError(
//       `Failed to fetch pipeline runs for pipeline ${pipelineId}: ${getErrorMessage(error)}`,
//       getErrorStatusCode(error) || HttpStatusCode.SERVICE_UNAVAILABLE,
//       ErrorCode.AZURE_PIPELINE_RUNS_FETCH_ERROR,
//       error,
//     );
//   }
// }

// async function getPipelineRunDetails(
//   pipelineId: number,
//   runId: number,
// ): Promise<PipelineRunDetail> {
//   try {
//     const response = await azureDevOpsClient.getPipelineRunDetails(pipelineId, runId);

//     const result: PipelineRunDetail = {
//       id: response.id,
//       name: response.name,
//       repo: response.resources?.pipelines?.['ci-artifact-pipeline']?.pipeline?.value.name,
//       version: response.resources?.pipelines?.['ci-artifact-pipeline']?.version,
//     };

//     return result;
//   } catch (error) {
//     console.error(`Error fetching details for pipeline ${pipelineId}, run ${runId}:`, error);
//     throw new ExternalAPIError(
//       `Failed to fetch pipeline run details for pipeline ${pipelineId}, run ${runId}: ${getErrorMessage(error)}`,
//       getErrorStatusCode(error) || HttpStatusCode.SERVICE_UNAVAILABLE,
//       ErrorCode.AZURE_PIPELINE_RUN_DETAILS_ERROR,
//       error,
//     );
//   }
// }

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

// Batch fetch multiple pipeline run details in parallel
// async function batchGetPipelineRunDetails(
//   runsToFetch: PipelineRun[],
// ): Promise<PipelineRunDetail[]> {
//   if (!runsToFetch || !runsToFetch.length) return [];

//   const results: PromiseSettledResult<PipelineRunDetail>[] = await Promise.allSettled(
//     runsToFetch.map(async ({ pipeline: { id: pipelineId }, id: pipelineRunId }) => {
//       try {
//         return await getPipelineRunDetails(pipelineId, pipelineRunId);
//       } catch (error) {
//         console.error(
//           `Error fetching details for pipeline ${pipelineId}, run ${pipelineRunId}:`,
//           error,
//         );
//         // Re-throw with pipeline context for Promise.allSettled
//         throw new ExternalAPIError(
//           `Failed to fetch details for pipeline ${pipelineId}, run ${pipelineRunId}: ${getErrorMessage(error)}`,
//           getErrorStatusCode(error) || HttpStatusCode.SERVICE_UNAVAILABLE,
//           ErrorCode.AZURE_BATCH_PIPELINE_DETAILS_ERROR,
//           error,
//         );
//       }
//     }),
//   );

//   // Process the results - extract fulfilled values and log rejected reasons
//   return results.flatMap((result) => {
//     if (result.status === 'fulfilled' && result.value !== null) {
//       return [result.value];
//     } else {
//       // Log the rejection but return null so other results can be processed
//       if (result.status === 'rejected') {
//         console.error(`Failed to fetch pipeline details: ${result.reason}`);
//       }
//       return [];
//     }
//   });
// }

// Fetch all runs for one pipeline in a single batch
async function getReleasePipelineRunsByEnvironment(
  pipelineId: number,
  environment: ENVIRONMENT,
): Promise<PipelineRun[]> {
  const pipelineRuns: PipelineRun[] = await getEnrichedPipelineRuns(pipelineId);

  if (!pipelineRuns?.length) {
    return [];
  }

  return pipelineRuns.filter((run) => run.environment === environment);
}

// Gets all pipeline runs for all pipelines
async function getAllPipelineRunsByEnvironment(
  releasePipelines: Pipeline[],
  environment: ENVIRONMENT,
): Promise<PipelineRun[]> {
  const results: PromiseSettledResult<PipelineRun | null>[] = await Promise.allSettled(
    releasePipelines.map(async (pipeline) => {
      const runs = await getReleasePipelineRunsByEnvironment(pipeline.id, environment);
      if (!runs || !runs.length) return null;

      // Sort runs by date and take the most recent
      const [mostRecentRun] = runs.sort(
        (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime(),
      );

      return mostRecentRun;
    }),
  );

  // Filter out rejected promises but log them
  return results.flatMap((result) => {
    if (result.status === 'fulfilled' && result.value !== null) {
      return [result.value];
    } else {
      return [];
    }
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
      // if (!details) return null;
      // const pipeline = runsToFetch[index].pipeline;
      // return {
      //   repo: details.resources?.pipelines?.['ci-artifact-pipeline']?.pipeline?.name,
      //   pipelineName: pipeline.name,
      //   runName: details.name,
      //   version: details.resources?.pipelines?.['ci-artifact-pipeline']?.version,
      // };
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

export default {
  getReleasedVersions,
  clearCache,
};

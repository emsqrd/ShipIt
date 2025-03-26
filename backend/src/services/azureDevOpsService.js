import azureDevOpsClient from '../clients/azureDevOpsClient.js';
import config from '../config/config.js';
import { AppError, ExternalAPIError, NotFoundError } from '../utils/errors.js';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = new Map();

// Simple cache helper functions
function getCachedData(key) {
  const cachedItem = cache.get(key);
  if (!cachedItem) return null;

  // Check if cache is still valid
  if (Date.now() > cachedItem.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cachedItem.data;
}

function setCachedData(key, data, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
  return data;
}

async function getReleasePipelines() {
  const cacheKey = 'pipelines';
  const cachedPipelines = getCachedData(cacheKey);
  if (cachedPipelines) return cachedPipelines;

  try {
    const result = await azureDevOpsClient.getPipelines();
    return setCachedData(cacheKey, result);
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    throw new ExternalAPIError(
      `Failed to fetch release pipelines: ${error.message}`,
      error.statusCode || 503,
      'AZURE_PIPELINE_FETCH_ERROR',
      error,
    );
  }
}

async function getReleasePipelineRuns(pipelineId) {
  try {
    return await azureDevOpsClient.getPipelineRuns(pipelineId);
  } catch (error) {
    console.error(`Error fetching pipeline runs for pipeline ${pipelineId}:`, error);
    throw new ExternalAPIError(
      `Failed to fetch pipeline runs for pipeline ${pipelineId}: ${error.message}`,
      error.statusCode || 503,
      'AZURE_PIPELINE_RUNS_FETCH_ERROR',
      error,
    );
  }
}

async function getPipelineRunDetails(pipelineId, runId) {
  try {
    return await azureDevOpsClient.getPipelineRunDetails(pipelineId, runId);
  } catch (error) {
    console.error(`Error fetching details for pipeline ${pipelineId}, run ${runId}:`, error);
    throw new ExternalAPIError(
      `Failed to fetch pipeline run details for pipeline ${pipelineId}, run ${runId}: ${error.message}`,
      error.statusCode || 503,
      'AZURE_PIPELINE_RUN_DETAILS_ERROR',
      error,
    );
  }
}

// Batch fetch multiple pipeline run details in parallel
async function batchGetPipelineRunDetails(runsToFetch) {
  if (!runsToFetch || !runsToFetch.length) return [];

  const results = await Promise.allSettled(
    runsToFetch.map(async ({ pipelineId, runId }) => {
      try {
        return await getPipelineRunDetails(pipelineId, runId);
      } catch (error) {
        console.error(`Error fetching details for pipeline ${pipelineId}, run ${runId}:`, error);
        // Re-throw with pipeline context for Promise.allSettled
        throw new ExternalAPIError(
          `Failed to fetch details for pipeline ${pipelineId}, run ${runId}: ${error.message}`,
          error.statusCode || 503,
          'AZURE_BATCH_PIPELINE_DETAILS_ERROR',
          error,
        );
      }
    }),
  );

  // Process the results - extract fulfilled values and log rejected reasons
  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // Log the rejection but return null so other results can be processed
      console.error(`Failed to fetch pipeline details: ${result.reason}`);
      return null;
    }
  });
}

// Fetch all runs for one pipeline in a single batch
async function getReleasePipelineRunsByEnvironment(pipelineId, environment) {
  const pipelineRuns = await getReleasePipelineRuns(pipelineId);

  if (!pipelineRuns?.value?.length) {
    return [];
  }

  return pipelineRuns.value.filter((run) => run.templateParameters.env === environment);
}

// Gets all pipeline runs for all pipelines in parallel
async function getAllPipelineRunsByEnvironment(releasePipelines, environment) {
  const results = await Promise.allSettled(
    releasePipelines.map(async (pipeline) => {
      try {
        const runs = await getReleasePipelineRunsByEnvironment(pipeline.id, environment);
        if (!runs || !runs.length) return null;

        // Sort runs by date and take the most recent
        const [mostRecentRun] = runs.sort(
          (a, b) => new Date(b.createdDate) - new Date(a.createdDate),
        );

        return {
          pipeline,
          run: mostRecentRun,
        };
      } catch (error) {
        console.error(`Error fetching runs for pipeline ${pipeline.id}:`, error);
        // Re-throw for Promise.allSettled
        throw new ExternalAPIError(
          `Failed to fetch runs for pipeline ${pipeline.id}: ${error.message}`,
          error.statusCode || 503,
          'AZURE_ENVIRONMENT_RUNS_ERROR',
          error,
        );
      }
    }),
  );

  // Filter out rejected promises but log them
  return results
    .map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Pipeline run fetch failed: ${result.reason}`);
        return null;
      }
    })
    .filter(Boolean); // Filter out nulls
}

// Get all released versions for a specific environment
export async function getReleasedVersions(environment) {
  try {
    // Get all release pipelines
    const pipelines = await getReleasePipelines();

    if (!pipelines?.value?.length) {
      throw new NotFoundError('No pipelines found');
    }

    const releasePipelines = pipelines.value.filter(
      (pipeline) =>
        pipeline.folder.includes(config.buildDefinitionFolder) &&
        !pipeline.folder.toLowerCase().includes('automated'),
    );

    if (releasePipelines.length === 0) {
      throw new NotFoundError('No release pipelines found matching the criteria');
    }

    // Get all pipeline runs in parallel (first level of parallelism)
    const validPipelineRuns = await getAllPipelineRunsByEnvironment(releasePipelines, environment);

    if (!validPipelineRuns.length) {
      return []; // Empty result but not an error
    }

    // Prepare batch requests for run details
    const runsToFetch = validPipelineRuns.map((item) => ({
      pipelineId: item.pipeline.id,
      runId: item.run.id,
      pipeline: item.pipeline,
    }));

    // Fetch all run details in parallel (second level of parallelism)
    const runDetailsList = await batchGetPipelineRunDetails(runsToFetch);

    // Map the results into the final format
    const releasedVersions = runDetailsList.map((details, index) => {
      if (!details) return null;

      const pipeline = runsToFetch[index].pipeline;
      return {
        repo: details.resources?.pipelines?.['ci-artifact-pipeline']?.pipeline?.name,
        pipelineName: pipeline.name,
        runName: details.name,
        version: details.resources?.pipelines?.['ci-artifact-pipeline']?.version,
      };
    });

    return releasedVersions.filter(Boolean);
  } catch (error) {
    // If it's already one of our application errors, rethrow it
    if (error instanceof AppError || (error && error.name === 'Error')) {
      throw error;
    }

    // Otherwise, wrap in a general error
    console.error('Error fetching released versions:', error);
    throw new ExternalAPIError(
      `Failed to fetch released versions for environment ${environment}: ${error.message}`,
      error.statusCode || 503,
      'AZURE_RELEASED_VERSIONS_ERROR',
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

import azureDevOpsClient from '../clients/azureDevOpsClient.js';

const releaseDirectory = process.env.BUILD_DEFINITION_FOLDER;

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
    return null;
  }
}

async function getReleasePipelineRuns(pipelineId) {
  try {
    return await azureDevOpsClient.getPipelineRuns(pipelineId);
  } catch (error) {
    console.error('Error fetching pipeline runs:', error);
    return null;
  }
}

async function getPipelineRunDetails(pipelineId, runId) {
  try {
    return await azureDevOpsClient.getPipelineRunDetails(pipelineId, runId);
  } catch (error) {
    console.error('Error fetching pipeline run details:', error);
    return null;
  }
}

// Batch fetch multiple pipeline run details in parallel
async function batchGetPipelineRunDetails(runsToFetch) {
  if (!runsToFetch || !runsToFetch.length) return [];

  return Promise.all(
    runsToFetch.map(async ({ pipelineId, runId }) => {
      try {
        return await getPipelineRunDetails(pipelineId, runId);
      } catch (error) {
        console.error(`Error fetching details for pipeline ${pipelineId}, run ${runId}:`, error);
        return null;
      }
    }),
  );
}

// Fetch all runs for one pipeline in a single batch
async function getReleasePipelineRunsByEnvironment(pipelineId, environment) {
  const pipelineRuns = await getReleasePipelineRuns(pipelineId);

  if (!pipelineRuns?.value?.length) {
    return null;
  }

  return pipelineRuns.value.filter((run) => run.templateParameters.env === environment);
}

// Gets all pipeline runs for all pipelines in parallel
async function getAllPipelineRunsByEnvironment(releasePipelines, environment) {
  return Promise.all(
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
        return null;
      }
    }),
  );
}

// Get all released versions for a specific environment
export async function getReleasedVersions(environment) {
  try {
    // Get all release pipelines
    const pipelines = await getReleasePipelines();

    if (!pipelines?.value?.length) {
      console.error('No pipelines found');
      return null;
    }

    const releasePipelines = pipelines.value.filter(
      (pipeline) =>
        pipeline.folder.includes(releaseDirectory) &&
        !pipeline.folder.toLowerCase().includes('automated'),
    );

    // Get all pipeline runs in parallel (first level of parallelism)
    const pipelineRuns = await getAllPipelineRunsByEnvironment(releasePipelines, environment);
    const validPipelineRuns = pipelineRuns.filter(Boolean);

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
    console.error('Error fetching released versions:', error);
    return [];
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

import azureDevOpsClient from '../clients/azureDevOpsClient.js';
import { ENVIRONMENT } from '../enums/environment.js';
import { ErrorCode } from '../enums/errorCode.js';
import { HttpStatusCode } from '../enums/httpStatusCode.js';
import {
  BuildTimelineRecord,
  Pipeline,
  PipelineRun,
  PipelineRunResponse,
  ReleasedVersion,
} from '../types/AzureDevOpsTypes.js';
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
export function clearCache(keyPattern: string | null = null) {
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

async function getBuildTimelineRecords(buildId: number): Promise<BuildTimelineRecord[]> {
  try {
    const response = await azureDevOpsClient.getBuildTimeline(buildId);

    const results: BuildTimelineRecord[] = response.records.map((timeline) => ({
      id: timeline.id,
      parentId: timeline.parentId,
      type: timeline.type,
      name: timeline.name,
      state: timeline.state,
      result: timeline.result,
    }));

    return results.filter((result) => result.parentId === null);
  } catch (error) {
    console.error('Error fetching build timeline:', error);
    throw new ExternalAPIError(
      `Failed to fetch build pipeline: ${getErrorMessage(error)}`,
      getErrorStatusCode(error) || HttpStatusCode.SERVICE_UNAVAILABLE,
      ErrorCode.AZURE_BUILD_TIMELINE_RESULTS_ERROR,
      error,
    );
  }
}

function filterReleasePipelines(pipelines: Pipeline[], releaseDirectories: string[]): Pipeline[] {
  return pipelines.filter((pipeline) => releaseDirectories.includes(pipeline.folder));
}

async function getReleasePipelines(): Promise<Pipeline[]> {
  const pipelines = await getPipelines();

  if (!pipelines?.length) {
    throw new NotFoundError('No pipelines found');
  }

  // Define the release directories we want to filter by
  const releaseDirectories = [config.manualReleaseDirectory, config.automatedReleaseDirectory];

  // Filter pipelines that have folders matching our release directories
  const releasePipelines = filterReleasePipelines(pipelines, releaseDirectories);

  if (releasePipelines.length === 0) {
    throw new NotFoundError('No release pipelines found matching the criteria');
  }

  return releasePipelines;
}

// Fetch all runs for one pipeline in a single batch
async function getMostRecentReleasePipelineRunByEnvironment(
  pipeline: Pipeline,
  environment: ENVIRONMENT,
): Promise<PipelineRun | null> {
  let mostRecentPipelineRun;

  const allRuns = (await azureDevOpsClient.getPipelineRuns(pipeline.id)).value;

  if (!allRuns || allRuns.length === 0) return null;

  const sortedRuns = allRuns.sort(
    (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime(),
  );

  // Get the most recent run for the environment
  if (pipeline.folder === config.manualReleaseDirectory) {
    mostRecentPipelineRun = sortedRuns.find((run) => run.templateParameters?.env === environment);
  } else if (pipeline.folder === config.automatedReleaseDirectory) {
    mostRecentPipelineRun = await findSuccessfulPipelineRunByStage(sortedRuns, environment);
  }

  if (!mostRecentPipelineRun) {
    return null;
  }

  const pipelineRunDetails = await azureDevOpsClient.getPipelineRunDetails(
    pipeline.id,
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
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    environment: mostRecentPipelineRun.templateParameters.env || environment,
    createdDate: mostRecentPipelineRun.createdDate,
    pipelineRunDetail: {
      id: pipelineRunDetails.id,
      name: pipelineRunDetails.name,
      repo: ciArtifactPipeline?.pipeline?.name,
      version: ciArtifactPipeline?.version,
    },
  };
}

/**
 * Find the most recent pipeline run that has a successful deployment stage for the given environment
 */
async function findSuccessfulPipelineRunByStage(
  sortedRuns: PipelineRunResponse['value'],
  environment: ENVIRONMENT,
): Promise<PipelineRunResponse['value'][number] | null> {
  const stageNameMap = new Map<ENVIRONMENT, string>([
    [ENVIRONMENT.DEV, 'DevDeploy'],
    [ENVIRONMENT.INT, 'IntDeploy'],
  ]);

  const stageName = stageNameMap.get(environment);
  if (!stageName) return null;

  // Find the first run that has a successful deployment stage
  for (const run of sortedRuns) {
    const buildTimelineRecord = await getBuildTimelineRecords(run.id);

    // Check if the timeline contains a successful stage with the target name
    const successfulStage = buildTimelineRecord.find(
      (record) =>
        record.parentId === null && record.name === stageName && record.result === 'succeeded',
    );

    if (successfulStage) {
      return run; // Found a successful run
    }
  }

  return null;
}

function getMostRecentRunPerRepo(pipelineRuns: PipelineRun[]): PipelineRun[] {
  // Group pipelines by repo name
  const repoGroups = new Map<string, PipelineRun[]>();

  for (const run of pipelineRuns) {
    const repo = run.pipelineRunDetail.repo;
    if (!repoGroups.has(repo)) {
      repoGroups.set(repo, []);
    }
    repoGroups.get(repo)!.push(run);
  }

  // For each repo group, select only the most recent run
  const latestRuns: PipelineRun[] = [];

  for (const runs of repoGroups.values()) {
    runs.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    latestRuns.push(runs[0]);
  }

  return latestRuns;
}

// Get all released versions for a specific environment
export async function getReleasedVersions(environment: ENVIRONMENT): Promise<ReleasedVersion[]> {
  try {
    // Get all release pipelines
    const releasePipelines = await getReleasePipelines();

    const validPipelineRunPromises = releasePipelines.map(async (pipeline) => {
      return await getMostRecentReleasePipelineRunByEnvironment(pipeline, environment);
    });

    // Wait for all promises to resolve
    const validPipelineRuns = await Promise.all(validPipelineRunPromises);

    const filteredPipelineRuns = validPipelineRuns.filter(
      (run): run is PipelineRun => run !== null,
    );

    const latestRuns = getMostRecentRunPerRepo(filteredPipelineRuns);

    // Map the results into the final format
    const releasedVersions: ReleasedVersion[] = latestRuns.map((pipelineRun) => ({
      repo: pipelineRun.pipelineRunDetail.repo,
      pipelineId: pipelineRun.pipelineId,
      pipelineName: pipelineRun.pipelineName,
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

export const __test__ = {
  filterReleasePipelines,
  getMostRecentRunPerRepo,
  findSuccessfulPipelineRunByStage,
};

export default {
  getReleasedVersions,
  clearCache,
};

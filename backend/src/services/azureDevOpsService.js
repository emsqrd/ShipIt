const azureBaseUrl = process.env.AZURE_BASE_URL;
const releaseDirectory = process.env.BUILD_DEFINITION_FOLDER;
const AZURE_HEADERS = {
  headers: {
    Authorization: `Basic ${process.env.AZURE_PAT}`,
  },
};

async function getReleasePipelines() {
  const pipelineUrl = `${azureBaseUrl}/pipelines?api-version=7.1`;
  const pipelineRes = await fetch(pipelineUrl, AZURE_HEADERS);

  if (!pipelineRes.ok) {
    console.error('Error fetching pipelines:', pipelineRes);
    return null;
  }

  return await pipelineRes.json();
}

async function getReleasePipelineRuns(pipelineId) {
  const pipelineRunsUrl = `${azureBaseUrl}/pipelines/${pipelineId}/runs?api-version=7.1`;
  const pipelineRunsRes = await fetch(pipelineRunsUrl, AZURE_HEADERS);

  if (!pipelineRunsRes.ok) {
    console.error('Error fetching pipeline runs:', pipelineRunsRes);
    return null;
  }

  return pipelineRunsRes.json();
}

async function getPipelineRunDetails(pipelineId, runId) {
  const pipelineRunUrl = `${azureBaseUrl}/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`;
  const pipelineRunRes = await fetch(pipelineRunUrl, AZURE_HEADERS);

  if (!pipelineRunRes.ok) {
    console.error('Error fetching pipeline run details:', pipelineRunRes);
    return null;
  }

  return pipelineRunRes.json();
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
    })
  );
}

// Optimized version - fetches all runs for one pipeline in a single batch
async function getReleasePipelineRunsByEnvironment(pipelineId, environment) {
  const pipelineRuns = await getReleasePipelineRuns(pipelineId);

  if (!pipelineRuns?.value?.length) {
    return null;
  }

  return pipelineRuns.value.filter((run) => run.templateParameters.env === environment);
}

// Optimized version - gets all pipeline runs for all pipelines in parallel
async function getAllPipelineRunsByEnvironment(releasePipelines, environment) {
  return Promise.all(
    releasePipelines.map(async (pipeline) => {
      try {
        const runs = await getReleasePipelineRunsByEnvironment(pipeline.id, environment);
        if (!runs || !runs.length) return null;

        // Sort runs by date and take the most recent
        const [mostRecentRun] = runs.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

        return {
          pipeline,
          run: mostRecentRun,
        };
      } catch (error) {
        console.error(`Error fetching runs for pipeline ${pipeline.id}:`, error);
        return null;
      }
    })
  );
}

export async function getReleasedVersions(environment) {
  try {
    // Get all release pipelines
    const pipelines = await getReleasePipelines();

    if (!pipelines?.value?.length) {
      console.error('No pipelines found');
      return null;
    }

    const releasePipelines = pipelines.value.filter(
      (pipeline) => pipeline.folder.includes(releaseDirectory) && !pipeline.folder.toLowerCase().includes('automated')
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

export default {
  getReleasedVersions,
};

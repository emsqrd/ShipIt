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
    return [];
  }

  const pipelines = await pipelineRes.json();
  const releasePipelines = pipelines.value.filter(
    (pipeline) => pipeline.folder.includes(releaseDirectory) && !pipeline.folder.toLowerCase().includes('automated')
  );

  return releasePipelines;
}

async function getReleasePipelineRuns(pipelineId) {
  const pipelineRunsUrl = `${azureBaseUrl}/pipelines/${pipelineId}/runs?api-version=7.1`;
  const pipelineRunsRes = await fetch(pipelineRunsUrl, AZURE_HEADERS);

  if (!pipelineRunsRes.ok) {
    console.error('Error fetching pipeline runs:', pipelineRunsRes);
    return [];
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

async function getReleasePipelineRunsByEnvironment(pipelineId, environment) {
  const pipelineRuns = await getReleasePipelineRuns(pipelineId);

  if (!pipelineRuns?.value?.length) {
    return null;
  }

  const environmentRuns = pipelineRuns.value.filter((run) => run.templateParameters.env === environment);

  if (!environmentRuns.length) {
    return null;
  }

  return environmentRuns;
}

async function getMostRecentPipelineRun(pipelineId, environment) {
  if (!pipelineId) {
    console.error('Pipeline ID not provided');
    return null;
  }

  if (!environment) {
    console.error('Environment not provided');
    return null;
  }

  try {
    const pipelineRunsByEnvironment = await getReleasePipelineRunsByEnvironment(pipelineId, environment);
    const [mostRecentRun] = pipelineRunsByEnvironment.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    const mostRecentRunDetails = await getPipelineRunDetails(pipelineId, mostRecentRun.id);

    if (!mostRecentRunDetails) {
      return null;
    }

    return {
      id: mostRecentRun.id,
      name: mostRecentRunDetails.name,
      version: mostRecentRunDetails.resources?.pipelines?.['ci-artifact-pipeline']?.version,
      repo: mostRecentRunDetails.resources?.pipelines?.['ci-artifact-pipeline']?.pipeline?.name,
    };
  } catch (error) {
    console.error(`Error fetching pipeline run for pipeline ${pipelineId}:`, error);
    return null;
  }
}

export async function getReleasedVersions(environment) {
  try {
    const pipelines = await getReleasePipelines();

    const releasedVersions = await Promise.all(
      pipelines.map(async (pipeline) => {
        try {
          const mostRecentRun = await getMostRecentPipelineRun(pipeline.id, environment);
          if (!mostRecentRun) return null;

          return {
            repo: mostRecentRun.repo,
            pipelineName: pipeline.name,
            runName: mostRecentRun.name,
            version: mostRecentRun.version,
          };
        } catch (error) {
          console.error(`Error processing pipeline ${pipeline.name}`, error);
          return null;
        }
      })
    );

    return releasedVersions.filter(Boolean);
  } catch (error) {
    console.error('Error fetching released versions:', error);
    return [];
  }
}

export default {
  getReleasedVersions,
};

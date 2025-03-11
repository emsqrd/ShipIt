const azureBaseUrl = process.env.AZURE_BASE_URL;
const releaseDirectory = process.env.BUILD_DEFINITION_FOLDER;

async function getReleasePipelines() {
  const pipelineUrl = `${azureBaseUrl}/pipelines?api-version=7.1`;
  const pipelineRes = await fetch(pipelineUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!pipelineRes.ok) {
    console.error('Error fetching pipelines:', pipelineRes);
    return [];
  }

  const pipelines = await pipelineRes.json();
  const releasePipelines = pipelines.value.filter(
    // eslint-disable-next-line comma-dangle
    (pipeline) => pipeline.folder.includes(releaseDirectory) && !pipeline.folder.toLowerCase().includes('automated')
  );

  return releasePipelines;
}

async function getReleasePipelineRuns(pipelineId) {
  const pipelineRunsUrl = `${azureBaseUrl}/pipelines/${pipelineId}/runs?api-version=7.1`;
  const pipelineRunsRes = await fetch(pipelineRunsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!pipelineRunsRes.ok) {
    console.error('Error fetching pipeline runs:', pipelineRunsRes);
    return [];
  }

  return pipelineRunsRes.json();
}

async function getMostRecentPipelineRun(pipelineId) {
  const pipelineRuns = await getReleasePipelineRuns(pipelineId);
  return pipelineRuns.value && pipelineRuns.value.length > 0 ? pipelineRuns.value[0] : null;
}

export async function getReleasedVersions() {
  const pipelines = await getReleasePipelines();

  const releasedVersions = pipelines.map(async (pipeline) => {
    const mostRecentRun = await getMostRecentPipelineRun(pipeline.id);

    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      runs: mostRecentRun
        ? {
            runId: mostRecentRun.id,
            runName: mostRecentRun.name,
          }
        : null,
    };
  });

  return Promise.all(releasedVersions);
}

export default {
  getReleasedVersions,
};

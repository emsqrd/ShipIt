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

async function pipelineRunDetails(pipelineId, runId) {
  const pipelineRunUrl = `${azureBaseUrl}/pipelines/${pipelineId}/runs/${runId}?api-version=7.1`;
  const pipelineRunRes = await fetch(pipelineRunUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!pipelineRunRes.ok) {
    console.error('Error fetching pipeline run details:', pipelineRunRes);
    return null;
  }

  return pipelineRunRes.json();
}

async function mostRecentPipelineRun(pipelineId, environment) {
  if (!pipelineId) {
    console.error('Pipeline ID not provided');
    return null;
  }

  if (!environment) {
    console.error('Environment not provided');
    return null;
  }

  try {
    const pipelineRuns = await getReleasePipelineRuns(pipelineId);

    if (!pipelineRuns?.value?.length) {
      return null;
    }

    const environmentRuns = pipelineRuns.value
      .filter((run) => run.templateParameters.env === environment)
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

    if (!environmentRuns.length) {
      return null;
    }

    const [mostRecentRun] = environmentRuns;
    const mostRecentRunDetails = await pipelineRunDetails(pipelineId, mostRecentRun.id);

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

export async function getReleasedVersions() {
  try {
    const pipelines = await getReleasePipelines();

    const releasedVersions = await Promise.all(
      pipelines.map((pipeline) =>
        mostRecentPipelineRun(pipeline.id, 'uat').then((mostRecentRun) =>
          mostRecentRun
            ? {
                repo: mostRecentRun.repo,
                pipelineName: pipeline.name,
                runName: mostRecentRun.name,
                version: mostRecentRun.version,
              }
            : null
        )
      )
    );

    return releasedVersions.filter((version) => version !== null);
    // const releasedVersions = pipelines.map(async (pipeline) => {
    //   const mostRecentRun = await mostRecentPipelineRun(pipeline.id, 'uat');

    //   if (mostRecentRun) {
    //     return {
    //       repo: mostRecentRun.repo,
    //       pipelineName: pipeline.name,
    //       runName: mostRecentRun.name,
    //       version: mostRecentRun.version,
    //     };
    //   }
    // });

    // return Promise.all(releasedVersions);
  } catch (error) {
    console.error('Error fetching released versions:', error);
    return [];
  }
}

export default {
  getReleasedVersions,
};

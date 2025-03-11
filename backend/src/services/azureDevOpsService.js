const azureBaseUrl = process.env.AZURE_BASE_URL;
const releaseDirectory = process.env.BUILD_DEFINITION_FOLDER;

const basePipelineUrl = `${azureBaseUrl}/pipelines?api-version=7.1`;

async function getReleasePipelines() {
  const pipelineRes = await fetch(basePipelineUrl, {
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

export async function getReleasedVersions() {
  return getReleasePipelines();
}

export default {
  getReleasedVersions,
};

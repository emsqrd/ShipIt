import express from 'express';
import { getReleasedVersions } from '../services/azureDevOpsService.js';

const router = express.Router();
const azureBaseUrl = process.env.AZURE_BASE_URL;
const directory = encodeURIComponent(process.env.BUILD_DEFINITION_FOLDER);

const baseDefinitionsUrl = `${azureBaseUrl}/build/definitions?path=${directory}&api-version=7.1`;
const baseBuildsUrl = `${azureBaseUrl}/build/builds?api-version=7.1`;

// Using Intl.DateTimeFormat to localize and format the date.
const dtFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const formatLocalDate = (date) => {
  if (!date) return null;
  return dtFormatter.format(new Date(date)).replace(/\//g, '-').replace(',', '');
};

router.get('/releasedVersions', async (_, res) => {
  const releasePipelines = await getReleasedVersions();

  res.json(releasePipelines);
});

router.get('/buildDefinitions', async (_, res) => {
  const definitionsRes = await fetch(baseDefinitionsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!definitionsRes.ok) {
    console.log(definitionsRes);
    res.status(definitionsRes.status).json({ error: definitionsRes.statusText });
    return;
  }

  const buildsRes = await fetch(baseBuildsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!buildsRes.ok) {
    res.status(buildsRes.status).json({ error: buildsRes.statusText });
    return;
  }

  const definitions = await definitionsRes.json();
  const buildsData = await buildsRes.json();

  const buildData = definitions.value.map((def) => {
    const uatBuild = buildsData.value.filter((build) => build.definition.id === def.id && build.buildNumber.includes('uat'))[0];
    return {
      definitionId: def.id,
      definitionName: def.name,
      build: {
        id: uatBuild?.id,
        name: uatBuild?.buildNumber,
        queuedDate: formatLocalDate(uatBuild?.queueTime),
        startedDate: formatLocalDate(uatBuild?.startTime),
        finishedDate: formatLocalDate(uatBuild?.finishTime),
      },
    };
  });

  res.json(buildData);
});

router.get('/definitions', async (_, res) => {
  const expressDefinitionsUrl = new URL(baseDefinitionsUrl);
  expressDefinitionsUrl.searchParams.append('definitionId', '117');

  const definitionsRes = await fetch(expressDefinitionsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!definitionsRes.ok) {
    console.log(definitionsRes);
    res.status(definitionsRes.status).json({ error: definitionsRes.statusText });
    return;
  }

  const buildsUrl = new URL(baseBuildsUrl);
  buildsUrl.searchParams.append('definitionId', '117');

  const buildsRes = await fetch(buildsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!buildsRes.ok) {
    res.status(buildsRes.status).json({ error: buildsRes.statusText });
    return;
  }

  const definition = await definitionsRes.json();
  const buildsData = await buildsRes.json();
  const builds = buildsData.value.filter((build) => build.buildNumber.includes('uat'));

  const buildData = {
    definitionId: definition.id,
    definitionName: definition.name,
    builds: builds.map((build) => ({
      id: build.id,
      name: build.buildNumber,
      queuedDate: formatLocalDate(build.queueTime),
      startedDate: formatLocalDate(build.startTime),
      finishedDate: formatLocalDate(build.finishTime),
    })),
  };

  res.json(buildData);
});

export default router;

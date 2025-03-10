import express from 'express';

const router = express.Router();
const azureBaseUrl = process.env.AZURE_BASE_URL;
const directory = encodeURIComponent(process.env.BUILD_DEFINITION_FOLDER);

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

router.get('/releasedVersions', (req, res) => {
  res.json({ message: 'Not implemented yet' });
});

router.get('/definitions', async (_, res) => {
  const definitionsUrl = `${azureBaseUrl}/build/definitions?path=${directory}&api-version=7.1&definitionId=117`;
  const buildsUrl = `${azureBaseUrl}/build/builds?api-version=7.1&definitions=117`;

  const definitionsRes = await fetch(definitionsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!definitionsRes.ok) {
    console.log(definitionsRes);
    res.status(definitionsRes.status).json({ error: definitionsRes.statusText });
    return;
  }

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
  const builds = buildsData.value.filter((build) => build.buildNumber.includes('int'));

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

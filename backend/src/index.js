import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const azureBaseUrl = process.env.AZURE_BASE_URL;
const directory = encodeURIComponent(process.env.BUILD_DEFINITION_FOLDER);

app.use(express.json());

app.get('/health', (req, res) => {
  res.send('Hello World!');
});

app.get('/releasedVersions', async (_, res) => {});

app.get('/definitions', async (_, res) => {
  const definitionsUrl = `${azureBaseUrl}/build/definitions?path=${directory}&api-version=7.1&definitionId=117`;
  const buildsUrl = `${azureBaseUrl}/build/builds?api-version=7.1&definitions=117`;

  const definitionsRes = await fetch(definitionsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!definitionsRes.ok) {
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

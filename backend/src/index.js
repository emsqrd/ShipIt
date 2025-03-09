import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.send('Hello World!');
});

app.get('/definitions', async (req, res) => {
  const azureBaseUrl = process.env.AZURE_BASE_URL;
  const ciDirectory = process.env.BUILD_DEFINITION_FOLDER;
  const buildDefinitionsUrl = `${azureBaseUrl}/build/definitions?path=${encodeURIComponent(ciDirectory)}&api-version=7.1`;

  const response = await fetch(buildDefinitionsUrl, {
    headers: {
      Authorization: `Basic ${process.env.AZURE_PAT}`,
    },
  });

  if (!response.ok) {
    res.status(response.status).json({ error: response.statusText });
    return;
  }

  console.log(response.url);

  const data = await response.json();

  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

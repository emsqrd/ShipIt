// Import environment variables first - before any other imports
import config from './config/config.js';
import './config/env.js';

import express from 'express';
import azureDevOpsRouter from './routes/azureDevOps.js';

// Validate configuration before starting the server
config.validate();

const app = express();
const PORT = config.port;

app.use(express.json());

app.get('/health', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/azure', azureDevOpsRouter);

app.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
});

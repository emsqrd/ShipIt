// Import environment variables first - before any other imports
import './config/env.js';

import express from 'express';
import azureDevOpsRouter from './routes/azureDevOps.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/azure', azureDevOpsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

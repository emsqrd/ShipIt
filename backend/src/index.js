import dotenv from 'dotenv';
import express from 'express';
import azureDevOpsRouter from './routes/azureDevOps.js';

dotenv.config();

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

// Import environment variables first - before any other imports
import './config/env.js';

import express from 'express';

import config from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import azureDevOpsRouter from './routes/azureDevOps.js';
import { NotFoundError } from './utils/errors.js';

// Validate configuration before configuring the app
config.validate();

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/azure', azureDevOpsRouter);

// 404 handler for undefined routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Central error handler - must be last middleware
app.use(errorHandler);

export default app;

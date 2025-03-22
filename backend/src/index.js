// Import environment variables first - before any other imports
import express from 'express';
import config from './config/config.js';
import './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import azureDevOpsRouter from './routes/azureDevOps.js';
import { NotFoundError } from './utils/errors.js';

// Validate configuration before starting the server
config.validate();

const app = express();
const PORT = config.port;

// Middleware
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/azure', azureDevOpsRouter);

// 404 handler for undefined routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Central error handler - must be last middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);

  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

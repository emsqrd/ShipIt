import app, { config } from './app.js';
import { logger } from './utils/logger.js';

const PORT = config.PORT;

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes('applicationinsights')) return;
  originalWarn(...args);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);

  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  process.exit(1);
});

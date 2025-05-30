import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { errorHandler } from './middleware/errorHandler.js';
import { logRequests } from './middleware/logRequests.js';
import azureDevOpsRouter from './routes/azureDevOps.js';
import { ConfigService } from './services/configService.js';
import { NotFoundError } from './utils/errors.js';

const config = ConfigService.fromEnvironment(process.env);

// Validate configuration before configuring the app
config.validate();

const app = express();

// Security middleware
app.use(helmet()); // Adds various HTTP headers for security
app.use(cors()); // Enable CORS for all routes

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Parsing middleware
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  // More informative health check
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

app.use('/api/azure', azureDevOpsRouter);

// 404 handler for undefined routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

// Central error handler - must be last middleware

//? Get this to work somehow later?
// app.use((err: ExtendedError, req: Request, res: Response, next: NextFunction) => {
//   return errorHandler(err, req, res, next);
// });

// @ts-expect-error - Express error handler types are complex
app.use(errorHandler);

app.use(logRequests);

export { config };
export default app;

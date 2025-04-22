import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger.js';

export function logRequests(req: Request, res: Response, next: NextFunction): void {
  logger.info(`[${req.method}] ${req.originalUrl}`);
  next();
}

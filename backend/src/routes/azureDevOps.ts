import express from 'express';

import { ENVIRONMENT } from '../enums/environment.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getReleasedVersions } from '../services/azureDevOpsService.js';
import { RequestValidationError } from '../utils/errors.js';

// Define type for the expected query parameters
type ReleasedVersionsQuery = {
  environment: string;
};

const router = express.Router();

/**
 * Type guard to check if a string is a valid ENVIRONMENT value
 */
function isValidEnvironment(value: string): value is ENVIRONMENT {
  return Object.values(ENVIRONMENT).includes(value as ENVIRONMENT);
}

router.get(
  '/releasedVersions',
  catchAsync(async (req, res) => {
    // Type the query parameters
    const { environment } = req.query as unknown as ReleasedVersionsQuery;

    // Check if environment parameter is provided
    if (!environment) {
      throw new RequestValidationError('Environment parameter is required');
    }

    // Validate the environment value
    if (!isValidEnvironment(environment)) {
      throw new RequestValidationError(
        `Invalid environment. Must be one of: ${Object.values(ENVIRONMENT).join(', ')}`,
      );
    }

    const releasedVersions = await getReleasedVersions(environment);

    res.json(releasedVersions);
  }),
);

export default router;

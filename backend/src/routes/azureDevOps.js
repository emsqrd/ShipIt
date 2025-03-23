import express from 'express';

import ENVIRONMENT from '../contracts/environment.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { getReleasedVersions } from '../services/azureDevOpsService.js';
import { ValidationError } from '../utils/errors.js';

const router = express.Router();

router.get(
  '/releasedVersions',
  catchAsync(async (req, res) => {
    const { environment } = req.query;

    // Check if environment parameter is provided
    if (!environment) {
      throw new ValidationError('Environment parameter is required');
    }

    // Validate the environment value
    if (!Object.values(ENVIRONMENT).includes(environment)) {
      throw new ValidationError(
        `Invalid environment. Must be one of: ${Object.values(ENVIRONMENT).join(', ')}`,
      );
    }

    const releasePipelines = await getReleasedVersions(environment);

    // Send response - empty array is a valid response, not an error
    res.json(releasePipelines || []);
  }),
);

export default router;

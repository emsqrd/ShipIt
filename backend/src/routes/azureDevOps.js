import express from 'express';
import ENVIRONMENT from '../contracts/environment.js';
import { getReleasedVersions } from '../services/azureDevOpsService.js';

const router = express.Router();

router.get('/releasedVersions', async (req, res) => {
  const { environment } = req.query;

  // Check if environment parameter is provided
  if (!environment) {
    return res.status(400).json({
      error: 'Environment parameter is required',
    });
  }

  // Validate the environment value
  if (!Object.values(ENVIRONMENT).includes(environment)) {
    return res.status(400).json({
      error: `Invalid environment. Must be one of: ${Object.values(ENVIRONMENT).join(', ')}`,
    });
  }

  const releasePipelines = await getReleasedVersions(environment);

  res.json(releasePipelines);
});

export default router;

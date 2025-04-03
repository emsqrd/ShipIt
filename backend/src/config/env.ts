/// <reference types="node" />
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { ErrorCode } from '../enums/ErrorCode.js';
import { AppError } from '../utils/errors.js';

/**
 * Interface defining the expected environment variables
 */
export interface Environment {
  PORT: number;
  AZURE_BASE_URL: string;
  AZURE_PAT: string;
  RELEASE_PIPELINE_FOLDER: string;
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Load environment variables from the root directory
const result = dotenv.config({ path: path.resolve(dirname, '../../.env') });

if (result.error) {
  // Type assertion for file system error
  const fsError = result.error as { code?: string };
  if (fsError.code === 'ENOENT') {
    // eslint-disable-next-line no-console
    console.info('No .env file found. Using default environment variables.');
  } else {
    throw new AppError(
      `Failed to load environment variables: ${result.error.message}`,
      500,
      ErrorCode.INTERNAL_ERROR,
    );
  }
}

// Validate required environment variables
const requiredEnvVars = ['AZURE_BASE_URL', 'AZURE_PAT'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  throw new AppError(
    `Missing required environment variables: ${missingVars.join(', ')}`,
    500,
    ErrorCode.INTERNAL_ERROR,
  );
}

// Set default values for optional variables with proper type coercion
process.env.PORT = String(process.env.PORT || 3000);
process.env.RELEASE_PIPELINE_FOLDER = process.env.RELEASE_PIPELINE_FOLDER || '\\RCT-CD';

// Export typed environment variables
export const env: Environment = {
  PORT: parseInt(process.env.PORT, 10),
  AZURE_BASE_URL: process.env.AZURE_BASE_URL!,
  AZURE_PAT: process.env.AZURE_PAT!,
  RELEASE_PIPELINE_FOLDER: process.env.RELEASE_PIPELINE_FOLDER,
};

/// <reference types="node" />
import { ErrorCode } from '../enums/errorCode.js';
import { AppError } from '../utils/errors.js';

export type NodeEnv = 'development' | 'production';

/**
 * Interface defining the expected environment variables
 */
export interface Environment {
  PORT: number;
  AZURE_BASE_URL: string;
  AZURE_PAT: string;
  MANUAL_RELEASE_DIRECTORY: string; // Also accessed as buildDefinitionFolder
  AUTOMATED_RELEASE_DIRECTORY: string;
  NODE_ENV: NodeEnv;
}

// ConfigService class to provide a singleton interface with property access
class ConfigService implements Environment {
  private readonly _PORT: number;
  private readonly _AZURE_BASE_URL: string;
  private readonly _AZURE_PAT: string;
  private readonly _MANUAL_RELEASE_DIRECTORY: string;
  private readonly _AUTOMATED_RELEASE_DIRECTORY: string;
  private readonly _NODE_ENV: NodeEnv;

  constructor(env = process.env) {
    const nodeEnv = env.NODE_ENV || 'development';
    if (!['development', 'production'].includes(nodeEnv)) {
      console.warn(`Invalid NODE_ENV: ${nodeEnv} defaulting to 'development'`);
      env.NODE_ENV = 'development';
    }

    // Set all properties
    this._PORT = parseInt(env.PORT || '3000', 10);
    this._AZURE_BASE_URL = env.AZURE_BASE_URL || '';
    this._AZURE_PAT = env.AZURE_PAT || '';
    this._MANUAL_RELEASE_DIRECTORY = env.MANUAL_RELEASE_DIRECTORY || '';
    this._AUTOMATED_RELEASE_DIRECTORY = env.AUTOMATED_RELEASE_DIRECTORY || '';
    this._NODE_ENV = env.NODE_ENV as NodeEnv;
  }

  get PORT() {
    return this._PORT;
  }
  get AZURE_BASE_URL() {
    return this._AZURE_BASE_URL;
  }
  get AZURE_PAT() {
    return this._AZURE_PAT;
  }
  get MANUAL_RELEASE_DIRECTORY() {
    return this._MANUAL_RELEASE_DIRECTORY;
  }
  get AUTOMATED_RELEASE_DIRECTORY() {
    return this._AUTOMATED_RELEASE_DIRECTORY;
  }
  get NODE_ENV() {
    return this._NODE_ENV;
  }

  static fromEnvironment(env: Partial<NodeJS.ProcessEnv> = {}): ConfigService {
    return new ConfigService({ ...process.env, ...env });
  }

  /**
   * Validates that all required configuration values are set
   * @throws Error if any required values are missing
   */
  validate() {
    const requiredEnvVars: Array<[string, string]> = [
      ['AZURE_BASE_URL', this.AZURE_BASE_URL],
      ['AZURE_PAT', this.AZURE_PAT],
      ['MANUAL_RELEASE_DIRECTORY', this.MANUAL_RELEASE_DIRECTORY],
      ['AUTOMATED_RELEASE_DIRECTORY', this.AUTOMATED_RELEASE_DIRECTORY],
    ];

    const missingVars = requiredEnvVars.filter(([_, value]) => !value).map(([name]) => name);

    if (missingVars.length > 0) {
      throw new AppError(
        `Missing required environment variables: ${missingVars.join(', ')}`,
        500,
        ErrorCode.INTERNAL_ERROR,
      );
    }
  }
}

export { ConfigService };
// Export a singleton instance
const config = new ConfigService();

// Default export the config service for compatibility with existing imports
export default config;

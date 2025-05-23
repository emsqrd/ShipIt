import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '../configService.js';

// Store original environment variables
const originalEnv = { ...process.env };

// Mock the appInsightsClient module to prevent real telemetry calls
jest.mock('../../utils/appInsights', () => ({
  __esModule: true,
  appInsightsClient: { 
    trackException: jest.fn(),
    trackTrace: jest.fn(),
  }
}));

jest.mock('../../utils/logger');

describe('ConfigService', () => {
  // Reset modules before each test
  beforeEach(() => {
    // Clear Jest's module cache so we can reimport with fresh environment variables
    jest.resetModules();

    // Reset environment variables to a clean state before each test
    process.env = { ...originalEnv };
  });

  // Restore the original env after all tests
  afterAll(() => {    
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should use process.env when no override is passed', () => {
      process.env.PORT = '1234';
      const svc = new ConfigService();
      expect(svc.PORT).toBe(1234);
    });

    it('should use default values when environment variables are not set', async () => {
      const configService = ConfigService.fromEnvironment({ NODE_ENV: undefined});
      
      // Verify all properties have their expected default values
      expect(configService.PORT).toBe(3000);
      expect(configService.AZURE_BASE_URL).toBe('');
      expect(configService.AZURE_PAT).toBe('');
      expect(configService.MANUAL_RELEASE_DIRECTORY).toBe('');
      expect(configService.AUTOMATED_RELEASE_DIRECTORY).toBe('');
      expect(configService.NODE_ENV).toBe('development');
    });

    it('should use environment variable values when set', async () => {
      const configService = ConfigService.fromEnvironment({
        PORT: '4000',
        AZURE_BASE_URL: 'https://dev.azure.com/myorg',
        AZURE_PAT: 'test-pat',
        MANUAL_RELEASE_DIRECTORY: 'manual-folder',
        AUTOMATED_RELEASE_DIRECTORY: 'automated-folder',
        NODE_ENV: 'production',
      });
      
      expect(configService.PORT).toBe(4000);
      expect(configService.AZURE_BASE_URL).toBe('https://dev.azure.com/myorg');
      expect(configService.AZURE_PAT).toBe('test-pat');
      expect(configService.MANUAL_RELEASE_DIRECTORY).toBe('manual-folder');
      expect(configService.AUTOMATED_RELEASE_DIRECTORY).toBe('automated-folder');
      expect(configService.NODE_ENV).toBe('production');
    });

    it('should use development as NODE_ENV when an invalid environment is used', async () => {
      const configService = ConfigService.fromEnvironment({
        NODE_ENV: 'blah',
      });

      expect(configService.NODE_ENV).toBe('development');
    });

    it('should respect process.env when no override is passed to fromEnvironment', () => {
      process.env.PORT = '4321';
      const svc = ConfigService.fromEnvironment();
      expect(svc.PORT).toBe(4321);
    });
  });

  describe('validate', () => {
    it('should throw an error when azureBaseUrl is missing', async () => {
      // Import the module fresh with the current environment variables
      const configService = ConfigService.fromEnvironment({
        PORT: '4000',
        AZURE_PAT: 'test-pat',
        MANUAL_RELEASE_DIRECTORY: 'manual-folder',
        AUTOMATED_RELEASE_DIRECTORY: 'automated-folder',
      });
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: AZURE_BASE_URL/);
    });

    it('should throw an error when both azureBaseUrl and azurePat are missing', async () => {      
      // Import the module fresh with the current environment variables
      const configService = ConfigService.fromEnvironment({
        PORT: '4000',
        MANUAL_RELEASE_DIRECTORY: 'manual-folder',
        AUTOMATED_RELEASE_DIRECTORY: 'automated-folder',
      });
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: AZURE_BASE_URL, AZURE_PAT/);
    });

    it('should not throw an error when all required environment variables are set', async () => {
      // Set up environment with all required variables
      const configService = ConfigService.fromEnvironment({
        AZURE_BASE_URL: 'https://dev.azure.com/myorg',
        AZURE_PAT: 'test-pat',
        MANUAL_RELEASE_DIRECTORY: 'manual-folder',
        AUTOMATED_RELEASE_DIRECTORY: 'automated-folder',
      });
      
      expect(() => configService.validate()).not.toThrow();
    });
  });
});
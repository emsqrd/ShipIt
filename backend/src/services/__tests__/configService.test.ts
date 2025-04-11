import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Store original environment variables
const originalEnv = { ...process.env };

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
    it('should use default values when environment variables are not set', async () => {
      // Clear environment variables that might interfere with this test
      delete process.env.PORT;
      delete process.env.AZURE_BASE_URL;
      delete process.env.AZURE_PAT;
      delete process.env.MANUAL_RELEASE_DIRECTORY;
      
      // Import the module fresh with the current environment variables
      const configService = (await import('../configService.js')).default;
      
      expect(configService.port).toBe(3000);
      expect(configService.azureBaseUrl).toBe('');
      expect(configService.azurePat).toBe('');
      expect(configService.manualReleaseDirectory).toBe('');
    });

    it('should use environment variable values when set', async () => {
      // Set up environment variables
      process.env.PORT = '4000';
      process.env.AZURE_BASE_URL = 'https://dev.azure.com/myorg';
      process.env.AZURE_PAT = 'test-pat';
      process.env.MANUAL_RELEASE_DIRECTORY = 'test-folder';
      
      // Import the module fresh with the current environment variables
      const configService = (await import('../configService.js')).default;
      
      expect(configService.port).toBe(4000);
      expect(configService.azureBaseUrl).toBe('https://dev.azure.com/myorg');
      expect(configService.azurePat).toBe('test-pat');
      expect(configService.manualReleaseDirectory).toBe('test-folder');
    });
  });

  describe('validate', () => {
    it('should throw an error when azureBaseUrl is missing', async () => {
      // Set up environment with missing azureBaseUrl
      delete process.env.AZURE_BASE_URL;
      process.env.AZURE_PAT = 'test-pat';
      
      // Import the module fresh with the current environment variables
      const configService = (await import('../configService.js')).default;
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: azureBaseUrl/);
    });

    it('should throw an error when azurePat is missing', async () => {
      // Set up environment with missing azurePat
      process.env.AZURE_BASE_URL = 'https://dev.azure.com/myorg';
      delete process.env.AZURE_PAT;
      
      // Import the module fresh with the current environment variables
      const configService = (await import('../configService.js')).default;
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: azurePat/);
    });

    it('should throw an error when both azureBaseUrl and azurePat are missing', async () => {
      // Clear both required variables
      delete process.env.AZURE_BASE_URL;
      delete process.env.AZURE_PAT;
      
      // Import the module fresh with the current environment variables
      const configService = (await import('../configService.js')).default;
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: azureBaseUrl, azurePat/);
    });

    it('should not throw an error when all required environment variables are set', async () => {
      // Set up environment with all required variables
      process.env.AZURE_BASE_URL = 'https://dev.azure.com/myorg';
      process.env.AZURE_PAT = 'test-pat';
      
      // Import the module fresh with the current environment variables
      const configService = (await import('../configService.js')).default;
      
      expect(() => configService.validate()).not.toThrow();
    });
  });
});
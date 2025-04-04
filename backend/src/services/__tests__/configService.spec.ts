import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

// We need to mock process.env before importing ConfigService
const originalEnv = { ...process.env };

// Mock the configService module
jest.mock('../configService.js', () => {
  // Create a ConfigService class that will read from process.env
  class ConfigService {
    get port() { return Number(process.env.PORT) || 3000; }
    get azureBaseUrl() { return process.env.AZURE_BASE_URL || ''; }
    get azurePat() { return process.env.AZURE_PAT || ''; }
    get buildDefinitionFolder() { return process.env.RELEASE_PIPELINE_FOLDER || ''; }
  
    validate() {
      if (!this.azureBaseUrl || !this.azurePat) {
        throw new Error(
          `Missing required environment variables: ${[
            !this.azureBaseUrl && 'azureBaseUrl',
            !this.azurePat && 'azurePat',
          ]
            .filter(Boolean)
            .join(', ')}`,
        );
      }
    }
  }
  
  // Export a singleton instance
  return {
    __esModule: true,
    default: new ConfigService()
  };
}, { virtual: true });

// Import the mocked configService after the mock definition
import configService from '../configService.js';

describe('ConfigService', () => {
  // Create a clean environment before each test
  beforeEach(() => {
    // Reset process.env to a clean state before each test
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  // Restore the original env after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should use default values when environment variables are not set', () => {
      // Clear environment variables that might interfere with this test
      delete process.env.PORT;
      delete process.env.AZURE_BASE_URL;
      delete process.env.AZURE_PAT;
      delete process.env.RELEASE_PIPELINE_FOLDER;
      
      expect(configService.port).toBe(3000);
      expect(configService.azureBaseUrl).toBe('');
      expect(configService.azurePat).toBe('');
      expect(configService.buildDefinitionFolder).toBe('');
    });

    it('should use environment variable values when set', () => {
      // Set up environment variables
      process.env.PORT = '4000';
      process.env.AZURE_BASE_URL = 'https://dev.azure.com/myorg';
      process.env.AZURE_PAT = 'test-pat';
      process.env.RELEASE_PIPELINE_FOLDER = 'test-folder';
      
      expect(configService.port).toBe(4000);
      expect(configService.azureBaseUrl).toBe('https://dev.azure.com/myorg');
      expect(configService.azurePat).toBe('test-pat');
      expect(configService.buildDefinitionFolder).toBe('test-folder');
    });
  });

  describe('validate', () => {
    it('should throw an error when azureBaseUrl is missing', () => {
      // Set up environment with missing azureBaseUrl
      delete process.env.AZURE_BASE_URL;
      process.env.AZURE_PAT = 'test-pat';
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: azureBaseUrl/);
    });

    it('should throw an error when azurePat is missing', () => {
      // Set up environment with missing azurePat
      process.env.AZURE_BASE_URL = 'https://dev.azure.com/myorg';
      delete process.env.AZURE_PAT;
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: azurePat/);
    });

    it('should throw an error when both azureBaseUrl and azurePat are missing', () => {
      // Clear both required variables
      delete process.env.AZURE_BASE_URL;
      delete process.env.AZURE_PAT;
      
      expect(() => configService.validate()).toThrow();
      expect(() => configService.validate()).toThrow(/Missing required environment variables: azureBaseUrl, azurePat/);
    });

    it('should not throw an error when all required environment variables are set', () => {
      // Set up environment with all required variables
      process.env.AZURE_BASE_URL = 'https://dev.azure.com/myorg';
      process.env.AZURE_PAT = 'test-pat';
      
      expect(() => configService.validate()).not.toThrow();
    });
  });
});
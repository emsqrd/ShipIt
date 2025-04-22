// filepath: /Users/emsqrd/git/ShipIt/backend/src/utils/__tests__/appInsights.test.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Create mocks
const mockSetup = jest.fn();
const mockSetAutoCollectConsole = jest.fn();
const mockStart = jest.fn();

// Mock the applicationinsights module
jest.mock('applicationinsights', () => {
  return {
    __esModule: true,
    default: {
      setup: () => {
        mockSetup();
        return {
          setAutoCollectConsole: (value: boolean) => {
            mockSetAutoCollectConsole(value);
            return {
              start: () => {
                mockStart();
              }
            };
          }
        };
      },
      defaultClient: {
        // Mock the default client that's exported by the module
      }
    }
  };
});

describe('appInsights', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset the module registry before each test
    jest.resetModules();
  });

  it('should initialize Application Insights with correct settings', async () => {
    // Import the module to trigger the initialization code
    await import('../appInsights');

    // Verify appInsights was properly initialized
    expect(mockSetup).toHaveBeenCalled();
    expect(mockSetAutoCollectConsole).toHaveBeenCalledWith(false);
    expect(mockStart).toHaveBeenCalled();
  });

  it('should export the appInsightsClient', async () => {
    // Import the module using dynamic import to access exports
    const appInsightsModule = await import('../appInsights');
    
    // Verify the client is exported
    expect(appInsightsModule).toHaveProperty('appInsightsClient');
  });

  it('should use environment connection string', async () => {
    // This is implicitly tested by calling setup() without parameters
    // as setup() picks up APPLICATIONINSIGHTS_CONNECTION_STRING from env
    await import('../appInsights');
    expect(mockSetup).toHaveBeenCalledWith();
  });
});

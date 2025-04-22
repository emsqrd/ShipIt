import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock needs to be before imports
const mockTrackTrace = jest.fn();
jest.mock('../appInsights', () => ({
  __esModule: true,
  appInsightsClient: {
    trackTrace: mockTrackTrace
  }
}));

import { LogEntry } from 'winston';
import Transport from 'winston-transport';
import { ApplicationInsightsTransport } from '../aiTransport';

const appInsightsMock = {
    trackTrace: mockTrackTrace,
};

// Spy on the Transport prototype emit method and return true
const mockEmit = jest.spyOn(Transport.prototype, 'emit').mockReturnValue(true);

// We don't need to mock the winston-transport module since we're spying on the prototype method

describe('ApplicationInsightsTransport', () => {
  let transport: ApplicationInsightsTransport;
  const mockCallback = jest.fn();

  beforeEach(() => {
    // Clear all mocks before each test but keep modules loaded
    jest.clearAllMocks();
    
    transport = new ApplicationInsightsTransport();
  });

  afterEach(() => {
    // No module resets here so spy on emit persists
    jest.clearAllMocks();
  });

  it('should emit logged event and call callback', () => {
    const logEntry: LogEntry = {
      level: 'info',
      message: 'Test message',
      service: 'test-service',
      env: 'test'
    };

    transport.log(logEntry, mockCallback);
    
    // Wait for setImmediate in the log method
    return new Promise<void>(resolve => {
      setImmediate(() => {
        expect(mockEmit).toHaveBeenCalledWith('logged', logEntry);
        expect(mockCallback).toHaveBeenCalled();
        resolve();
      });
    });
  });

  it('should map Winston log levels to App Insights severity', () => {
    const testCases = [
      { level: 'silly', expectedSeverity: 0 },
      { level: 'debug', expectedSeverity: 0 },
      { level: 'verbose', expectedSeverity: 0 },
      { level: 'info', expectedSeverity: 1 },
      { level: 'warn', expectedSeverity: 2 },
      { level: 'error', expectedSeverity: 3 },
      { level: 'unknown', expectedSeverity: 1 } // Should default to 1
    ];

    testCases.forEach(({ level, expectedSeverity }) => {
      const logEntry: LogEntry = {
        level,
        message: `Test message for ${level}`,
        service: 'test-service',
        env: 'test'
      };

      transport.log(logEntry, mockCallback);
      
      expect(appInsightsMock.trackTrace).toHaveBeenCalledWith({
        message: logEntry.message,
        severity: expectedSeverity,
        properties: {
          service: logEntry.service,
          env: logEntry.env,
        }
      });
    });
  });

  it('should include meta properties when provided', () => {
    const logEntry: LogEntry = {
      level: 'info',
      message: 'Test message with meta',
      service: 'test-service',
      env: 'test',
      meta: {
        correlationId: '123456',
        userId: 'test-user'
      }
    };

    transport.log(logEntry, mockCallback);
    
    expect(mockTrackTrace).toHaveBeenCalledWith({
      message: logEntry.message,
      severity: 1,
      properties: {
        service: logEntry.service,
        env: logEntry.env,
        correlationId: '123456',
        userId: 'test-user'
      }
    });
  });

  it('should handle null appInsightsClient gracefully', async () => {
    // Re-mock with null client
    jest.resetModules();
    jest.mock('../appInsights', () => ({
      __esModule: true,
      appInsightsClient: null
    }));
    
    // We need to reimport to get the version with null client
    const { ApplicationInsightsTransport } = await import('../aiTransport');
    const nullClientTransport = new ApplicationInsightsTransport();
    
    const logEntry: LogEntry = {
      level: 'info',
      message: 'Test message',
      service: 'test-service',
      env: 'test'
    };

    // This should not throw an error
    expect(() => {
      nullClientTransport.log(logEntry, mockCallback);
    }).not.toThrow();
    
    expect(mockCallback).toHaveBeenCalled();
  });
});

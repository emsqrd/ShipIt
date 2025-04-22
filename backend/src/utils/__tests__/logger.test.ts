import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { transports } from 'winston';

// Mock the appInsightsClient module to prevent real telemetry calls
jest.mock('../../utils/appInsights', () => ({
  __esModule: true,
  appInsightsClient: { trackException: jest.fn() }
}));

describe('logger', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV } as typeof process.env;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should have debug level when not production', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('../logger');
    expect(logger.level).toBe('debug');
  });

  it('should have info level when production', async () => {
    process.env.NODE_ENV = 'production';
    const { logger } = await import('../logger');
    expect(logger.level).toBe('info');
  });

  it('should have a single console transport', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('../logger');
    const { ApplicationInsightsTransport } = await import('../aiTransport');
    expect(logger.transports).toHaveLength(2);
    expect(logger.transports.some(t => t instanceof transports.Console)).toBe(true);
    expect(logger.transports.some(t => t instanceof ApplicationInsightsTransport)).toBe(true);
  });

  it('should set custom properties for logging', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('../logger');
    expect(logger.defaultMeta).toEqual({ service: 'shipit.api', env: process.env.NODE_ENV});
  });
});

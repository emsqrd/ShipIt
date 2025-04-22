import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { transports } from 'winston';

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
    expect(logger.transports).toHaveLength(1);
    expect(logger.transports[0]).toBeInstanceOf(transports.Console);
  });

  it('should set defaultMeta.service to shipit.api', async () => {
    process.env.NODE_ENV = 'development';
    const { logger } = await import('../logger');
    expect(logger.defaultMeta).toEqual({ service: 'shipit.api' });
  });
});

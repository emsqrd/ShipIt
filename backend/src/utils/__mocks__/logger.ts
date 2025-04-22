import { jest } from '@jest/globals';
import type { Logger } from 'winston';

export const logger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  // Add any other methods your codebase uses
} as unknown as Logger;

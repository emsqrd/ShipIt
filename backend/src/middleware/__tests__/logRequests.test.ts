import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { logRequests } from '../logRequests';

// Mock the appInsightsClient module to prevent real telemetry calls
jest.mock('../../utils/appInsights', () => ({
  __esModule: true,
  appInsightsClient: { trackException: jest.fn() }
}));

describe('logRequests middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let loggerInfoSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockReq = { method: 'GET', originalUrl: '/test' } as Partial<Request>;
    mockRes = {} as Partial<Response>;
    mockNext = jest.fn();
    loggerInfoSpy = jest.spyOn(logger, 'info').mockReturnValue(logger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should log the request method and url and call next', () => {
    logRequests(mockReq as Request, mockRes as Response, mockNext);

    expect(loggerInfoSpy).toHaveBeenCalledWith('[GET] /test');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle different HTTP methods correctly', () => {
    mockReq.method = 'POST';
    mockReq.originalUrl = '/submit';

    logRequests(mockReq as Request, mockRes as Response, mockNext);

    expect(loggerInfoSpy).toHaveBeenCalledWith('[POST] /submit');
    expect(mockNext).toHaveBeenCalled();
  });
});

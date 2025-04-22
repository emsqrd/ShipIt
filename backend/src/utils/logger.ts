import { createLogger, format, transports } from 'winston';

import { ApplicationInsightsTransport } from './aiTransport.js';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'shipit.api' },
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new ApplicationInsightsTransport(),
  ],
});

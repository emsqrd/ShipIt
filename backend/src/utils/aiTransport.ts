import type { LogEntry } from 'winston';
import Transport from 'winston-transport';

import { appInsightsClient } from './appInsights.js';

export class ApplicationInsightsTransport extends Transport {
  log(info: LogEntry, callback: () => void) {
    setImmediate(() => this.emit('logged', info));

    // Map Winston level to App Insights severity
    const severityMap: Record<string, number> = {
      silly: 0,
      debug: 0,
      verbose: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    appInsightsClient?.trackTrace({
      message: info.message,
      severity: severityMap[info.level] ?? 1,
      properties: {
        service: info.service,
        env: info.env,
        ...(info.meta || {}),
      },
    });

    callback();
  }
}

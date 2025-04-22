import appInsights from 'applicationinsights';

appInsights
  .setup() // picks up APPLICATIONINSIGHTS_CONNECTION_STRING from env
  .setAutoCollectConsole(false) // we'll capture logs manually
  .start();

export const appInsightsClient = appInsights.defaultClient;

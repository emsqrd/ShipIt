export type AppErrorType = {
  statusCode: number;
  code: string;
  message: string;
  name: string;
};

export type ExternalAPIErrorType = AppErrorType & {
  originalError: Error | null;
};

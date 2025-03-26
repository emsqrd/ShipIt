export type Pipeline = {
  id: number;
  name: string;
  folder: string;
};

export type PipelineRun = {
  pipelineId: number;
  pipelineRunId: number;
  pipeline: string;
};

export type PipelineRunDetails = {
  id: number;
  pipelineRunName: string;
  pipelineName: string;
  repo: string;
  version: string;
};

export type PipelinesResponse = {
  value: Pipeline[];
};

export type PipelineRunsResponse = {
  value: PipelineRun[];
};

export type RunDetailsResponse = {
  name: string;
  resources?: {
    pipelines?: {
      [key: string]: {
        pipeline?: {
          name: string;
        };
        version?: string;
      };
    };
  };
};

export type ReleasedVersion = {
  repo: string;
  pipelineName: string;
  runName: string;
  version: string;
};

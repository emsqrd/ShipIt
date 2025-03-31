// Azure DevOps API Response Types
export type PipelineResponse = {
  value: {
    id: number;
    name: string;
    folder: string;
    url: string;
  }[];
};

export type PipelineRunResponse = {
  value: {
    id: number;
    name: string;
    templateParameters: {
      env: string;
    };
    createdDate: string;
    pipeline: {
      id: number;
      name: string;
      folder: string;
      url: string;
    };
  }[];
};

export type PipelineRunDetailResponse = {
  id: number;
  name: string;
  pipeline: {
    id: number;
    name: string;
    folder: string;
    url: string;
  };
  resources: {
    pipelines: {
      ['ci-artifact-pipeline']: {
        pipeline: {
          id: number;
          name: string;
          folder: string;
          url: string;
        };
        version: string;
      };
    };
  };
};

// Domain Pipeline Types
export type Pipeline = {
  id: number;
  name: string;
  folder: string;
};

export type PipelineRun = {
  id: number;
  name: string;
  environment: string;
  createdDate: string;
  pipeline: Pipeline;
  pipelineRunDetail: PipelineRunDetail;
};

export type PipelineRunDetail = {
  id: number;
  name: string;
  repo: string;
  version: string;
};

// Domain Release Types
export type ReleasedVersion = {
  repo: string;
  pipelineName: string;
  runName: string;
  version: string;
};

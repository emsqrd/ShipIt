// Azure DevOps API Response Types
export type PipelineResponse = {
  value: {
    id: number;
    name: string;
    folder: string;
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
  }[];
};

export type PipelineRunDetailResponse = {
  id: number;
  name: string;
  resources: {
    pipelines: {
      ['ci-artifact-pipeline']: {
        pipeline: {
          name: string;
        };
        version: string;
      };
    };
  };
};

export type BuildTimelineResponse = {
  records: {
    id: string;
    parentId: string | null;
    type: string;
    name: string;
    state: string;
    result: string;
  }[];
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
  pipelineId: number;
  pipelineName: string;
  environment: string;
  createdDate: string;
  pipelineRunDetail: PipelineRunDetail;
};

export type PipelineRunDetail = {
  id: number;
  name: string;
  repo: string;
  version: string;
};

export type BuildTimelineRecord = {
  id: string;
  parentId: string;
  type: string;
  name: string;
  state: string;
  result: string;
};

// Domain Release Types
export type ReleasedVersion = {
  repo: string;
  pipelineId: number;
  pipelineName: string;
  runId: number;
  runName: string;
  version: string;
};

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import ReleasedVersionItem from './ReleasedVersionItem';

const mockReleaseVersionItem: ReleasedVersion = {
  id: 123,
  repo: 'my-repo',
  pipelineName: 'Build and Deploy',
  runName: 'run #123',
  version: 'v1.2.3',
};

function renderReleasedVersionItem(version = mockReleaseVersionItem) {
  render(<ReleasedVersionItem {...version} />);

  return version;
}

describe('ReleasedVersionItem', () => {
  it('renders the repo name', () => {
    renderReleasedVersionItem();

    expect(screen.getByText('my-repo')).toBeInTheDocument();
  });

  it('renders the pipeline name', () => {
    renderReleasedVersionItem();

    expect(screen.getByText('Build and Deploy')).toBeInTheDocument();
  });

  it('renders the run name', () => {
    renderReleasedVersionItem();

    expect(screen.getByText('run #123')).toBeInTheDocument();
  });

  it('renders the version tag', () => {
    renderReleasedVersionItem();

    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('contains four columns with appropriate content', () => {
    const releasedVersionItem = renderReleasedVersionItem();

    const repoColumn = screen.getByTestId('repo-column');
    const pipelineColumn = screen.getByTestId('pipeline-column');
    const runColumn = screen.getByTestId('run-column');
    const versionColumn = screen.getByTestId('version-column');

    expect(repoColumn).toHaveTextContent(releasedVersionItem.repo);
    expect(pipelineColumn).toHaveTextContent(releasedVersionItem.pipelineName);
    expect(runColumn).toHaveTextContent(releasedVersionItem.runName);
    expect(versionColumn).toHaveTextContent(releasedVersionItem.version);
  });
});

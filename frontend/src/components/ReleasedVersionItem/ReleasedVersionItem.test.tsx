import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import ReleasedVersionItem from './ReleasedVersionItem';

const mockReleaseVersionItem: ReleasedVersion = {
  repo: 'my-repo',
  pipelineName: 'Build and Deploy',
  runName: 'run #123',
  version: 'v1.2.3',
};

function renderReleasedVersionItem(releasedVersion = mockReleaseVersionItem) {
  render(<ReleasedVersionItem releasedVersion={{ ...releasedVersion }} />);

  return releasedVersion;
}

describe('ReleasedVersionItem', () => {
  it('renders the repo name', () => {
    renderReleasedVersionItem();

    expect(screen.getByText('my-repo')).toBeInTheDocument();
  });

  it('renders the version tag', () => {
    renderReleasedVersionItem();

    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('contains four columns with appropriate content', () => {
    const releasedVersionItem = renderReleasedVersionItem();

    const repoColumn = screen.getByTestId('repo-column');
    const versionColumn = screen.getByTestId('version-column');

    expect(repoColumn).toHaveTextContent(releasedVersionItem.repo);
    expect(versionColumn).toHaveTextContent(releasedVersionItem.version);
  });
});

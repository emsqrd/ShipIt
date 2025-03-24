import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import ReleasedVersionItem from './ReleasedVersionItem';

describe('ReleasedVersionItem', () => {
  const mockVersion: ReleasedVersion = {
    id: 123,
    repo: 'my-repo',
    pipelineName: 'Build and Deploy',
    runName: 'run #123',
    version: 'v1.2.3',
  };

  beforeEach(() => {
    render(<ReleasedVersionItem {...mockVersion} />);
  });

  it('renders the repo name', () => {
    expect(screen.getByText('my-repo')).toBeInTheDocument();
  });

  it('renders the pipeline name', () => {
    expect(screen.getByText('Build and Deploy')).toBeInTheDocument();
  });

  it('renders the run name', () => {
    expect(screen.getByText('run #123')).toBeInTheDocument();
  });

  it('renders the version tag', () => {
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('sets an accessible label on the row container', () => {
    const row = screen.getByRole('row');
    expect(row).toHaveAttribute('aria-label', 'my-repo version v1.2.3');
  });

  it('contains four cells with role="cell"', () => {
    const cells = screen.getAllByRole('cell');
    expect(cells).toHaveLength(4);
  });
});

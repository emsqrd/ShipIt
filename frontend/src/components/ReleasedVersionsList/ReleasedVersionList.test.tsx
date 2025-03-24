import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchReleasedVersions } from '../../services/releasedVersionsService';
import ReleasedVersionsList from './ReleasedVersionsList';
import styles from './ReleasedVersionsList.module.css';

// Mock the service
vi.mock('../../services/releasedVersionsService');

describe('ReleasedVersionsList', () => {
  const mockVersions = [
    {
      id: 1,
      repo: 'test-repo',
      pipelineName: 'main-pipeline',
      runName: 'daily-build',
      version: '1.0.0',
    },
    {
      id: 2,
      repo: 'test-repo-2',
      pipelineName: 'feature-pipeline',
      runName: 'feature-build',
      version: '1.1.0',
    },
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should display released versions after loading', async () => {
    // Arrange
    vi.mocked(fetchReleasedVersions).mockResolvedValue(mockVersions);

    // Act
    render(<ReleasedVersionsList />);

    // Assert loading state is shown initially
    expect(screen.getByRole('table')).toBeInTheDocument();
    const skeletonRows = document.getElementsByClassName(styles['version-item-skeleton']);
    expect(skeletonRows.length).toBe(3);

    // Wait for loading state to disappear
    await waitForElementToBeRemoved(
      () => document.getElementsByClassName(styles['version-item-skeleton'])[0],
    );

    // Verify the data from the mock versions is visible on the page
    // First version
    expect(screen.getByText('test-repo')).toBeInTheDocument();
    expect(screen.getByText('main-pipeline')).toBeInTheDocument();
    expect(screen.getByText('daily-build')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();

    // Second version
    expect(screen.getByText('test-repo-2')).toBeInTheDocument();
    expect(screen.getByText('feature-pipeline')).toBeInTheDocument();
    expect(screen.getByText('feature-build')).toBeInTheDocument();
    expect(screen.getByText('1.1.0')).toBeInTheDocument();

    // Verify service was called correctly
    expect(fetchReleasedVersions).toHaveBeenCalledTimes(1);
    expect(fetchReleasedVersions).toHaveBeenCalledWith('uat');
  });
});

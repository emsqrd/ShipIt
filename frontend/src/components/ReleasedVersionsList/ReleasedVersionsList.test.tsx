import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import { fetchReleasedVersions } from '../../services/releasedVersionsService';
import ReleasedVersionsList from './ReleasedVersionsList';

// Mock the service
vi.mock('../../services/releasedVersionsService');

function renderReleasedVersionsList(environment = 'UAT') {
  render(<ReleasedVersionsList environment={environment} />);
}

describe('ReleasedVersionsList', () => {
  // Common test data
  const mockVersions: ReleasedVersion[] = [
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

  const noReleasedVersionsMessage = '📦No released versions available';
  const errorMessage = '⚠️Failed to load released versions';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial render', () => {
    it('displays a skeleton loader by default', () => {
      // Prevent promise from resolving during this test
      const pendingPromise = new Promise<ReleasedVersion[]>(() => {});
      vi.mocked(fetchReleasedVersions).mockReturnValue(pendingPromise);

      renderReleasedVersionsList();

      expect(screen.getByTestId('released-versions-table')).toBeInTheDocument();
      const skeletonRows = screen.getAllByTestId('skeleton-loader');
      expect(skeletonRows.length).toBe(3);
    });

    it('calls fetchReleasedVersions with the correct environment', async () => {
      const expectedEnvironment = 'uat';
      vi.mocked(fetchReleasedVersions).mockResolvedValue(mockVersions);

      renderReleasedVersionsList(expectedEnvironment);

      await waitFor(() => {
        expect(fetchReleasedVersions).toHaveBeenCalledTimes(1);
      });

      expect(fetchReleasedVersions).toHaveBeenCalledWith(expectedEnvironment);
    });
  });

  describe('data states', () => {
    it('displays the released versions when data is loaded', async () => {
      vi.mocked(fetchReleasedVersions).mockResolvedValue(mockVersions);

      renderReleasedVersionsList();

      await waitFor(() => {
        expect(screen.queryAllByTestId('skeleton-loader').length).toBe(0);
      });

      // First version
      expect(screen.getByText('test-repo')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();

      // Second version
      expect(screen.getByText('test-repo-2')).toBeInTheDocument();
      expect(screen.getByText('1.1.0')).toBeInTheDocument();
    });

    it('displays a message when there are no released versions', async () => {
      vi.mocked(fetchReleasedVersions).mockResolvedValue([]);

      renderReleasedVersionsList();

      await waitFor(() => {
        expect(screen.queryAllByTestId('skeleton-loader').length).toBe(0);
      });

      expect(screen.getByTestId('no-versions-list-message')).toHaveTextContent(
        noReleasedVersionsMessage,
      );
    });

    it('displays an error message when the service fails', async () => {
      vi.mocked(fetchReleasedVersions).mockRejectedValue(new Error('API Error'));

      renderReleasedVersionsList();

      await waitFor(() => {
        expect(screen.queryAllByTestId('skeleton-loader').length).toBe(0);
      });

      expect(screen.getByTestId('release-versions-error-message')).toHaveTextContent(errorMessage);
    });
  });
});

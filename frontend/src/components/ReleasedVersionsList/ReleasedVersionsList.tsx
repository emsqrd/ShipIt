import React, { useEffect, useState } from 'react';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import { fetchReleasedVersions } from '../../services/releasedVersionsService';
import ReleasedVersionItem from '../ReleasedVersionItem/ReleasedVersionItem';
import styles from './ReleasedVersionsList.module.css';

const ReleasedVersionsList: React.FC = () => {
  const [releasedVersions, setReleasedVersions] = useState<ReleasedVersion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReleasedVersions = async () => {
      try {
        setIsLoading(true);
        const data = await fetchReleasedVersions('perf1');
        setReleasedVersions(data);
        setError(null);
      } catch (_) {
        setError('Failed to load released versions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReleasedVersions();
  }, []);

  // Loading skeleton UI
  const loadingSkeletonRows = Array(3)
    .fill(0)
    .map((_, index) => (
      <div
        data-testid="skeleton-loader"
        role="row"
        className={styles['version-item-skeleton']}
        key={`skeleton-${index}`}
      >
        <div className={styles['skeleton-cell']}></div>
        <div className={styles['skeleton-cell']}></div>
        <div className={styles['skeleton-cell']}></div>
        <div className={styles['skeleton-cell']}></div>
      </div>
    ));

  const renderContent = () => {
    if (isLoading) {
      return (
        <div role="rowgroup" className={styles['version-list']}>
          {loadingSkeletonRows}
        </div>
      );
    }

    if (error) {
      return (
        <div
          data-testid="release-versions-error-message"
          role="rowgroup"
          className={styles['error-container']}
        >
          <div role="row" className={styles['error-message']}>
            <span role="cell">
              <span className={styles['error-icon']}>⚠️</span>
              {error}
            </span>
          </div>
        </div>
      );
    }

    if (releasedVersions.length === 0) {
      return (
        <div data-testid="no-versions-list" role="rowgroup" className={styles['no-version-list']}>
          <div data-testid="no-versions-list-row" role="row" className={styles['no-version-item']}>
            <span
              data-testid="no-versions-list-message"
              role="cell"
              className={styles['no-version-text']}
            >
              <span className={styles['empty-icon']}>📦</span>
              No released versions available
            </span>
          </div>
        </div>
      );
    }

    return (
      <div role="rowgroup" className={styles['version-list']}>
        {releasedVersions.map((item) => (
          <ReleasedVersionItem key={item.id} {...item} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles['container']}>
      <div
        data-testid="released-versions-table"
        role="table"
        aria-label="Released Versions"
        className={styles['version-table']}
      >
        <div role="rowgroup">
          <div role="row" className={styles['version-list-header']}>
            <span role="columnheader" className={styles['repo-column']}>
              Repo
            </span>
            <span role="columnheader" className={styles['pipeline-column']}>
              Pipeline Name
            </span>
            <span role="columnheader" className={styles['run-column']}>
              Run Name
            </span>
            <span role="columnheader" className={styles['version-column']}>
              Version
            </span>
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default ReleasedVersionsList;

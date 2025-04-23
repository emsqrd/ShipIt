import React, { useEffect, useState } from 'react';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import { fetchReleasedVersions } from '../../services/releasedVersionsService';
import ReleasedVersionItem from '../ReleasedVersionItem/ReleasedVersionItem';
import styles from './ReleasedVersionsList.module.css';

interface ReleasedVersionsListProps {
  environment: string;
}

const ReleasedVersionsList: React.FC<ReleasedVersionsListProps> = ({ environment }) => {
  const [releasedVersions, setReleasedVersions] = useState<ReleasedVersion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReleasedVersions = async () => {
      try {
        setIsLoading(true);
        const data = await fetchReleasedVersions(environment.toLowerCase());
        setReleasedVersions(data);
        setError(null);
      } catch (_) {
        setError('Failed to load released versions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReleasedVersions();
  }, [environment]);

  // Loading skeleton UI
  const loadingSkeletonRows = Array(3)
    .fill(0)
    .map((_, index) => (
      <div
        data-testid="skeleton-loader"
        className={styles['version-item-skeleton']}
        key={`skeleton-${index}`}
      >
        <div className={styles['skeleton-cell']}></div>
        <div className={styles['skeleton-cell']}></div>
      </div>
    ));

  const renderContent = () => {
    if (isLoading) {
      return <div className={styles['version-list']}>{loadingSkeletonRows}</div>;
    }

    if (error) {
      return (
        <div data-testid="release-versions-error-message" className={styles['error-container']}>
          <div className={styles['error-message']}>
            <span>
              <span className={styles['error-icon']}>⚠️</span>
              {error}
            </span>
          </div>
        </div>
      );
    }

    if (releasedVersions.length === 0) {
      return (
        <div data-testid="no-versions-list" className={styles['no-version-list']}>
          <div data-testid="no-versions-list-row" className={styles['no-version-item']}>
            <span data-testid="no-versions-list-message" className={styles['no-version-text']}>
              <span className={styles['empty-icon']}>📦</span>
              No released versions available
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={styles['version-list']}>
        {releasedVersions.map((item) => (
          <ReleasedVersionItem key={item.id} releasedVersion={{ ...item }} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles['container']}>
      <div data-testid="released-versions-table" className={styles['version-table']}>
        <div>
          <div className={styles['version-list-header']}>
            <span className={styles['repo-column']}>Repo</span>
            <span className={styles['version-column']}>Version</span>
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default ReleasedVersionsList;

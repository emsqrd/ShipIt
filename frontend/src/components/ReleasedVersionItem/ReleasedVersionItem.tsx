import { useState } from 'react';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

interface ReleasedVersionItemProps {
  releasedVersion: ReleasedVersion;
}

const ReleasedVersionItem: React.FC<ReleasedVersionItemProps> = ({ releasedVersion }) => {
  const [showSubItem, setShowSubItem] = useState<boolean>(false);

  const handleReleasedItemClick = () => {
    setShowSubItem(!showSubItem);
  };

  return (
    <div className={`${styles['version-item']} ${showSubItem ? styles['expanded'] : ''}`}>
      <div
        className={styles['version-item-main']}
        onClick={handleReleasedItemClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleReleasedItemClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={showSubItem}
      >
        <span data-testid="repo-column" className={styles['repo-column']}>
          <div className={styles['repo-name']}>{releasedVersion.repo}</div>
        </span>
        <span data-testid="version-column" className={styles['version-column']}>
          <div className={styles['version-tag']}>{releasedVersion.version}</div>
        </span>
        <span className={styles['expand-icon']}>{showSubItem ? '▲' : '▼'}</span>
      </div>
      {showSubItem && (
        <div className={styles['version-item-sub']}>
          <span data-testid="pipeline-column" className={styles['pipeline-column']}>
            <label>Pipeline</label>
            <div className={styles['pipeline-name']}>{releasedVersion.pipelineName}</div>
          </span>
          <span data-testid="run-column" className={styles['run-column']}>
            <label>Run</label>
            <div className={styles['run-name']}>{releasedVersion.runName}</div>
          </span>
        </div>
      )}
    </div>
  );
};

export default ReleasedVersionItem;

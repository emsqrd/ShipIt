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

  const renderSubItem = () => {
    if (showSubItem) {
      return (
        <div className={styles['version-item-sub']}>
          <span data-testid="pipeline-column" className={styles['pipeline-column']}>
            <div className={styles['pipeline-name']}>{releasedVersion.pipelineName}</div>
          </span>
          <span data-testid="run-column" className={styles['run-column']}>
            <div className={styles['run-name']}>{releasedVersion.runName}</div>
          </span>
        </div>
      );
    }
  };
  return (
    <div className={styles['version-item']}>
      <div className={styles['version-item-main']} onClick={() => handleReleasedItemClick()}>
        <span data-testid="repo-column" className={styles['repo-column']}>
          <label>Repo</label>
          <div className={styles['repo-name']}>{releasedVersion.repo}</div>
        </span>
        <span data-testid="version-column" className={styles['version-column']}>
          <label>Version</label>
          <div className={styles['version-tag']}>{releasedVersion.version}</div>
        </span>
      </div>
      {renderSubItem()}
    </div>
  );
};

export default ReleasedVersionItem;

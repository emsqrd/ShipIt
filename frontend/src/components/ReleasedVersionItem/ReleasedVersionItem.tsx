import { useState } from 'react';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

interface ReleasedVersionItemProps {
  releasedVersion: ReleasedVersion;
}

const ReleasedVersionItem: React.FC<ReleasedVersionItemProps> = ({ releasedVersion }) => {
  const [isFlipped, setFlipped] = useState(false);

  return (
    <div className={styles.cardContainer} onClick={() => setFlipped((flipped) => !flipped)}>
      <div className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}>
        <div className={styles.front}>
          <span data-testid="repo-column" className={styles['repo-column']}>
            <label>Repo</label>
            <div className={styles['repo-name']}>{releasedVersion.repo}</div>
          </span>
          <span data-testid="version-column" className={styles['version-column']}>
            <label>Version</label>
            <div className={styles['version-tag']}>{releasedVersion.version}</div>
          </span>
        </div>
        <div className={styles.back}>
          <span data-testid="pipeline-column" className={styles['pipeline-column']}>
            <div className={styles['pipeline-name']}>{releasedVersion.pipelineName}</div>
          </span>
          <span data-testid="run-column" className={styles['run-column']}>
            <div className={styles['run-name']}>{releasedVersion.runName}</div>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReleasedVersionItem;

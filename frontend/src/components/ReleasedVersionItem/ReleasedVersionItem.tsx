import { useState } from 'react';

import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

interface ReleasedVersionItemProps {
  releasedVersion: ReleasedVersion;
}

const ReleasedVersionItem: React.FC<ReleasedVersionItemProps> = ({ releasedVersion }) => {
  const [isFlipped, setFlipped] = useState(false);

  return (
    <div className={styles.cardContainer}>
      <div className={styles.card}>
        <div className={`${styles.cardInner} ${isFlipped ? styles.flipped : ''}`}>
          <div className={styles.front}>
            <span data-testid="repo-column">
              <div className={styles.repo}>{releasedVersion.repo}</div>
            </span>
            <span data-testid="version-column">
              <div className={styles.version}>{releasedVersion.version}</div>
            </span>
          </div>
          <div className={styles.back}>
            <span data-testid="pipeline-column">
              <label>Pipeline</label>
              <div className={styles.pipeline}>{releasedVersion.pipelineName}</div>
            </span>
            <span data-testid="run-column">
              <label>Run</label>
              <div className={styles.run}>{releasedVersion.runName}</div>
            </span>
          </div>
        </div>
        <div className={styles.cardFooter}>
          <button type="button" onClick={() => setFlipped((f) => !f)}>
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReleasedVersionItem;

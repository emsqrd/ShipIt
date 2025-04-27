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
            <div className={styles.cardContent}>
              <div data-testid="repo-column" className={styles.repoSection}>
                <div className={styles.repo}>{releasedVersion.repo}</div>
              </div>
              <div data-testid="version-column" className={styles.versionSection}>
                <div className={styles.version}>{releasedVersion.version}</div>
              </div>
            </div>
          </div>
          <div className={styles.back}>
            <div className={styles.cardContent}>
              <div data-testid="pipeline-column" className={styles.pipeline}>
                <label>Pipeline</label>
                <div className={styles.pipeline}>{releasedVersion.pipelineName}</div>
              </div>
              <div data-testid="run-column" className={styles.run}>
                <label>Run</label>
                <div className={styles.run}>{releasedVersion.runName}</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.cardFooter}>
          <div className={styles.buttonContainer}>
            <button
              className={styles.detailsButton}
              type="button"
              onClick={() => setFlipped((f) => !f)}
            >
              {isFlipped ? 'Back' : 'Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleasedVersionItem;

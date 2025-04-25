import { useState } from 'react';

import AzureIcon from '../../assets/AzureIcon';
import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

interface ReleasedVersionItemProps {
  releasedVersion: ReleasedVersion;
}

const ReleasedVersionItem: React.FC<ReleasedVersionItemProps> = ({ releasedVersion }) => {
  const [isFlipped, setFlipped] = useState(false);

  return (
    <div className={styles.cardScene} onClick={() => setFlipped((f) => !f)}>
      <div className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}>
        <div className={styles.front}>
          <div className={styles.cardHeader}>
            <div data-testid="repo-column" className={styles.repoSection}>
              <span className={styles.badgeIcon}>{AzureIcon({})}</span>
              <div className={styles.repoName}>{releasedVersion.repo}</div>
            </div>
          </div>
          <div className={styles.versionRow}>
            <div data-testid="version-column" className={styles.versionSection}>
              <div className={styles.versionTag}>{releasedVersion.version}</div>
            </div>
          </div>
        </div>
        <div className={styles.back}>
          <div className={styles.cardContent}>
            <div className={styles.infoItem}>
              <label className={styles.infoLabel}>Pipeline</label>
              <div data-testid="pipeline-column" className={styles.infoValue}>
                {releasedVersion.pipelineName}
              </div>
            </div>
            <div className={styles.infoItem}>
              <label className={styles.infoLabel}>Run</label>
              <div data-testid="run-column" className={styles.infoValue}>
                {releasedVersion.runName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleasedVersionItem;

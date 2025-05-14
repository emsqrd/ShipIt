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
      <div
        className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
        role="region"
        aria-label={`Release information for ${releasedVersion.repo}`}
      >
        <div className={styles.front}>
          <div className={styles.cardHeader}>
            <div className={styles.cardBadge}>Release</div>
          </div>
          <div className={styles.cardContent}>
            <div data-testid="repo-column" className={styles.repoSection}>
              <h3 className={styles.repoName} title={releasedVersion.repo}>
                {releasedVersion.repo}
              </h3>
            </div>
            <div data-testid="version-column" className={styles.versionSection}>
              <div className={styles.versionLabel}>Version</div>
              <div className={styles.version} title={releasedVersion.version}>
                {releasedVersion.version}
              </div>
            </div>
          </div>
          <div className={styles.cardFooter}>
            <button
              className={styles.detailsButton}
              type="button"
              onClick={() => setFlipped(true)}
              aria-label={`Show pipeline details for ${releasedVersion.repo}`}
            >
              <span>Show Pipeline Details</span>
              <span className={styles.buttonIcon}>→</span>
            </button>
          </div>
        </div>
        <div className={styles.back}>
          <div className={styles.cardHeader}>
            <div className={styles.cardBadge}>Pipeline Details</div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.backInfoSection}>
              <div data-testid="pipeline-column" className={styles.infoItem}>
                <h4 className={styles.infoLabel}>Pipeline</h4>
                <div className={styles.infoValue} title={releasedVersion.pipelineName}>
                  {releasedVersion.pipelineName}
                </div>
              </div>
              <div data-testid="run-column" className={styles.infoItem}>
                <h4 className={styles.infoLabel}>Run</h4>
                <div className={styles.infoValue} title={releasedVersion.runName}>
                  {releasedVersion.runName}
                </div>
              </div>
              <div data-testid="run-column" className={styles.infoItem}>
                <h4 className={styles.infoLabel}>Repository</h4>
                <div className={styles.infoValue} title={releasedVersion.repo}>
                  {releasedVersion.runName}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.cardFooter}>
            <button
              className={`${styles.detailsButton} ${styles.backButton}`}
              type="button"
              onClick={() => setFlipped(false)}
              aria-label="Return to version information"
            >
              <span className={styles.buttonIcon}>←</span>
              <span>Back to Version</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleasedVersionItem;

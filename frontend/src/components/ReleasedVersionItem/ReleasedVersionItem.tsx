import type { ReleasedVersion as ReleasedVersionItem } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

function ReleasedVersionItem(releasedVersion: ReleasedVersionItem) {
  return (
    <li className={styles['version-item']}>
      <span className={styles['repo-column']}>{releasedVersion.repo}</span>
      <span className={styles['pipeline-column']}>{releasedVersion.pipelineName}</span>
      <span className={styles['run-column']}>{releasedVersion.runName}</span>
      <span className={styles['version-column']}>{releasedVersion.version}</span>
    </li>
  );
}

export default ReleasedVersionItem;

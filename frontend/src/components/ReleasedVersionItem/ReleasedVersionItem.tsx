import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

const ReleasedVersionItem: React.FC<ReleasedVersion> = ({
  repo,
  pipelineName,
  runName,
  version,
}) => {
  return (
    <div className={styles['version-item']}>
      <span data-testid="repo-column" className={styles['repo-column']}>
        <div className={styles['repo-name']}>{repo}</div>
      </span>
      <span data-testId="pipeline-column" className={styles['pipeline-column']}>
        <div className={styles['pipeline-name']}>{pipelineName}</div>
      </span>
      <span data-testId="run-column" className={styles['run-column']}>
        <div className={styles['run-name']}>{runName}</div>
      </span>
      <span data-testId="version-column" className={styles['version-column']}>
        <div className={styles['version-tag']}>{version}</div>
      </span>
    </div>
  );
};

export default ReleasedVersionItem;

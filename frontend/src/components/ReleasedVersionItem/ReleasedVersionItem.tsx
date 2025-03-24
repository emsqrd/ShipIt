import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

const ReleasedVersionItem: React.FC<ReleasedVersion> = ({
  repo,
  pipelineName,
  runName,
  version,
}) => {
  return (
    <div role="row" className={styles['version-item']} aria-label={`${repo} version ${version}`}>
      <span role="cell" className={styles['repo-column']}>
        <div className={styles['repo-name']}>{repo}</div>
      </span>
      <span role="cell" className={styles['pipeline-column']}>
        <div className={styles['pipeline-name']}>{pipelineName}</div>
      </span>
      <span role="cell" className={styles['run-column']}>
        <div className={styles['run-name']}>{runName}</div>
      </span>
      <span role="cell" className={styles['version-column']}>
        <div className={styles['version-tag']}>{version}</div>
      </span>
    </div>
  );
};

export default ReleasedVersionItem;

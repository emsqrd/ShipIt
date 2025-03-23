import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import styles from './ReleasedVersionItem.module.css';

const ReleasedVersionItem: React.FC<ReleasedVersion> = ({
  repo,
  pipelineName,
  runName,
  version,
}) => {
  return (
    <div role="row" className={styles['version-item']}>
      <span role="cell" className={styles['repo-column']}>
        {repo}
      </span>
      <span role="cell" className={styles['pipeline-column']}>
        {pipelineName}
      </span>
      <span role="cell" className={styles['run-column']}>
        {runName}
      </span>
      <span role="cell" className={styles['version-column']}>
        {version}
      </span>
    </div>
  );
};

export default ReleasedVersionItem;

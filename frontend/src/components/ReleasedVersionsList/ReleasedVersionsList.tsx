import type { ReleasedVersion } from '../../contracts/ReleasedVersion';
import ReleasedVersionItem from '../ReleasedVersionItem/ReleasedVersionItem';
import styles from './ReleasedVersionsList.module.css';

const ReleasedVersionsList: React.FC = () => {
  const releasedVersions: ReleasedVersion[] = [
    {
      id: 1,
      repo: 'address_svc',
      pipelineName: 'address_svc-CD',
      runName: 'uat_20250222-1',
      version: '20250128.1',
    },
    {
      id: 2,
      repo: 'admin-svc',
      pipelineName: 'admin-svc-CD',
      runName: 'uat_20250228-1',
      version: '20250228.1',
    },
    {
      id: 3,
      repo: 'billing-svc',
      pipelineName: 'billing-svc-CD',
      runName: 'uat_20250301-2',
      version: '20250301.2',
    },
  ];

  const noReleaseVersionsDisplay = (
    <div role="rowgroup" className={styles['no-version-list']}>
      <div role="row" className={styles['no-version-item']}>
        <span role="cell" className={styles['no-version-text']}>
          No released versions available.
        </span>
      </div>
    </div>
  );

  const releaseVersionList = (
    <div role="rowgroup" className={styles['version-list']}>
      {releasedVersions.map((item) => (
        <ReleasedVersionItem key={item.id} {...item} />
      ))}
    </div>
  );

  let releasedVersionContent;

  if (releasedVersions.length > 0) {
    releasedVersionContent = releaseVersionList;
  } else {
    releasedVersionContent = noReleaseVersionsDisplay;
  }

  return (
    <div role="table" aria-label="Released Versions" className={styles['version-table']}>
      <div role="rowgroup">
        <div role="row" className={styles['version-list-header']}>
          <span role="columnheader" className={styles['repo-column']}>
            Repo
          </span>
          <span role="columnheader" className={styles['pipeline-column']}>
            Pipeline Name
          </span>
          <span role="columnheader" className={styles['run-column']}>
            Run Name
          </span>
          <span role="columnheader" className={styles['version-column']}>
            Version
          </span>
        </div>
      </div>

      {releasedVersionContent}
    </div>
  );
};

export default ReleasedVersionsList;

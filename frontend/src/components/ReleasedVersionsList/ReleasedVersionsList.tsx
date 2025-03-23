import styles from './ReleasedVersionsList.module.css';

function ReleasedVersionsList() {
  const releasedVersions = [
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

  return (
    <>
      <div className={styles['version-list-header']}>
        <span className={styles['repo-column']}>Repo</span>
        <span className={styles['pipeline-column']}>Pipeline Name</span>
        <span className={styles['run-column']}>Run Name</span>
        <span className={styles['version-column']}>Version</span>
      </div>

      <ul className={styles['version-list']}>
        {releasedVersions.map((item) => (
          <li key={item.id} className={styles['version-item']}>
            <span className={styles['repo-column']}>{item.repo}</span>
            <span className={styles['pipeline-column']}>{item.pipelineName}</span>
            <span className={styles['run-column']}>{item.runName}</span>
            <span className={styles['version-column']}>{item.version}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default ReleasedVersionsList;

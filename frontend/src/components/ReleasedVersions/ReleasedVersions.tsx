function ReleasedVersions() {
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
    <div className="version-container">
      <h2 className="version-header">Released Versions</h2>

      <div className="version-list-header">
        <span className="repo-column">Repo</span>
        <span className="pipeline-column">Pipeline Name</span>
        <span className="run-column">Run Name</span>
        <span className="version-column">Version</span>
      </div>

      <ul className="version-list">
        {releasedVersions.map((item) => (
          <li key={item.id} className="version-item">
            <span className="repo-column">{item.repo}</span>
            <span className="pipeline-column">{item.pipelineName}</span>
            <span className="run-column">{item.runName}</span>
            <span className="version-column">{item.version}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ReleasedVersions;

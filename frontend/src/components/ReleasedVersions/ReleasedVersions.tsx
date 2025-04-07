import { useState } from 'react';

import ReleasedVersionsList from '../ReleasedVersionsList/ReleasedVersionsList';
import styles from './ReleasedVersions.module.css';

const ReleasedVersions: React.FC = () => {
  const environments = ['DEV', 'INT', 'UAT', 'PERF1'];
  const [selectedEnvironment, setSelectedEnvironment] = useState(environments[0]);

  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEnvironment(e.target.value);
  };

  const environmentDropdown = (
    <select
      name="environment"
      id="environment-select"
      value={selectedEnvironment}
      onChange={handleEnvironmentChange}
    >
      {environments.map((env) => (
        <option key={env} value={env}>
          {env}
        </option>
      ))}
    </select>
  );

  return (
    <div className={styles['version-container']}>
      <header className={styles['version-header-container']}>
        <h1 className={styles['version-header']}>Released Versions</h1>
        <p className={styles['version-description']}>
          Track all version releases across repositories
        </p>
      </header>
      {environmentDropdown}
      <ReleasedVersionsList environment={selectedEnvironment} />
    </div>
  );
};

export default ReleasedVersions;

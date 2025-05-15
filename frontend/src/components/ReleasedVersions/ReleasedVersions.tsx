import { useState } from 'react';

import Dropdown from '../Dropdown/Dropdown';
import ReleasedVersionsList from '../ReleasedVersionsList/ReleasedVersionsList';
import styles from './ReleasedVersions.module.css';

const LOCAL_STORAGE_KEY = 'selectedEnvironment';

const ReleasedVersions: React.FC = () => {
  const environments = [
    'DEV',
    'INT',
    'UAT',
    'PERF1',
    'PERF2',
    'PERF1_2',
    'PROD1',
    'PROD2',
    'PROD1_2',
  ];

  const [selectedEnvironment, setSelectedEnvironment] = useState(() => {
    const savedEnv = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedEnv && environments.includes(savedEnv) ? savedEnv : environments[2];
  });

  return (
    <div className={styles['version-container']}>
      <header className={styles['version-header-container']}>
        <div className={styles['header-flex-container']}>
          <h1 className={styles['version-header']}>Released Versions</h1>
          <div className={styles['environment-selector-container']}>
            <span className={styles['environment-label']}>Environment:</span>
            <Dropdown
              options={environments}
              selectedOption={selectedEnvironment}
              storageKey={LOCAL_STORAGE_KEY}
              onOptionChange={setSelectedEnvironment}
            />
          </div>
        </div>
        <p className={styles['version-description']}>
          Track all version releases across repositories
        </p>
      </header>
      <ReleasedVersionsList environment={selectedEnvironment} />
    </div>
  );
};

export default ReleasedVersions;

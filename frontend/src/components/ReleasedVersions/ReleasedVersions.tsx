import ReleasedVersionsList from '../ReleasedVersionsList/ReleasedVersionsList';
import styles from './ReleasedVersions.module.css';

const ReleasedVersions: React.FC = () => {
  const environment = ['DEV', 'INT', 'UAT', 'PERF'];

  const environmentSelector = (
    <select name="environment" id="environment-select">
      {environment.map((env) => (
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
      {environmentSelector}
      <ReleasedVersionsList />
    </div>
  );
};

export default ReleasedVersions;

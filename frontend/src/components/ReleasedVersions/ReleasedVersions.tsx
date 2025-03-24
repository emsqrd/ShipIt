import ReleasedVersionsList from '../ReleasedVersionsList/ReleasedVersionsList';
import styles from './ReleasedVersions.module.css';

const ReleasedVersions: React.FC = () => {
  return (
    <div className={styles['version-container']}>
      <header className={styles['version-header-container']}>
        <h1 className={styles['version-header']}>Released Versions</h1>
        <p className={styles['version-description']}>
          Track all version releases across repositories
        </p>
      </header>
      <ReleasedVersionsList />
    </div>
  );
};

export default ReleasedVersions;

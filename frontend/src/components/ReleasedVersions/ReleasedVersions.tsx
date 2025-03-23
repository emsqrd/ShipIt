import ReleasedVersionsList from '../ReleasedVersionsList/ReleasedVersionsList';
import styles from './ReleasedVersions.module.css';

const ReleasedVersions: React.FC = () => {
  return (
    <div className={styles['version-container']}>
      <h2 className={styles['version-header']}>Released Versions</h2>
      <ReleasedVersionsList />
    </div>
  );
};

export default ReleasedVersions;

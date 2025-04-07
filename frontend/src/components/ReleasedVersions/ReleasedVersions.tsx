import { useEffect, useRef, useState } from 'react';

import ReleasedVersionsList from '../ReleasedVersionsList/ReleasedVersionsList';
import styles from './ReleasedVersions.module.css';

const LOCAL_STORAGE_KEY = 'selectedEnvironment';

const ReleasedVersions: React.FC = () => {
  const environments = ['DEV', 'INT', 'UAT', 'PERF1'];

  const [selectedEnvironment, setSelectedEnvironment] = useState(() => {
    const savedEnv = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedEnv && environments.includes(savedEnv) ? savedEnv : environments[0];
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, selectedEnvironment);
  }, [selectedEnvironment]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Scroll the selected option into view when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && selectedOptionRef.current) {
      selectedOptionRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isDropdownOpen]);

  const handleEnvironmentChange = (env: string) => {
    setSelectedEnvironment(env);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const customDropdown = (
    <div
      className={styles['custom-dropdown-container']}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        className={styles['dropdown-toggle']}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isDropdownOpen}
        aria-label="Select environment"
      >
        <span>{selectedEnvironment}</span>
        <span className={styles['dropdown-arrow']}>{isDropdownOpen ? '▲' : '▼'}</span>
      </button>
      {isDropdownOpen && (
        <ul
          className={styles['dropdown-options']}
          role="listbox"
          aria-activedescendant={`env-option-${selectedEnvironment.toLowerCase()}`}
        >
          {environments.map((env) => (
            <li
              key={env}
              id={`env-option-${env.toLowerCase()}`}
              className={`${styles['dropdown-option']} ${selectedEnvironment === env ? styles['selected'] : ''}`}
              onClick={() => handleEnvironmentChange(env)}
              role="option"
              aria-selected={selectedEnvironment === env}
              ref={selectedEnvironment === env ? selectedOptionRef : null}
            >
              {env}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className={styles['version-container']}>
      <header className={styles['version-header-container']}>
        <div className={styles['header-flex-container']}>
          <h1 className={styles['version-header']}>Released Versions</h1>
          <div className={styles['environment-selector-container']}>
            <span className={styles['environment-label']}>Environment:</span>
            {customDropdown}
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

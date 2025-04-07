import { useEffect, useRef, useState } from 'react';

import styles from './Dropdown.module.css';

interface DropdownProps {
  options: string[];
  selectedOption: string;
  storageKey: string;
  onOptionChange: (option: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  selectedOption,
  storageKey,
  onOptionChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, selectedOption);
  }, [storageKey, selectedOption]);

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

  const handleOptionChange = (option: string) => {
    onOptionChange(option);
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

  return (
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
        <span>{selectedOption}</span>
        <span className={styles['dropdown-arrow']}>{isDropdownOpen ? '▲' : '▼'}</span>
      </button>
      {isDropdownOpen && (
        <ul
          className={styles['dropdown-options']}
          role="listbox"
          aria-activedescendant={`env-option-${selectedOption.toLowerCase()}`}
        >
          {options.map((option) => (
            <li
              key={option}
              id={`env-option-${option.toLowerCase()}`}
              className={`${styles['dropdown-option']} ${selectedOption === option ? styles['selected'] : ''}`}
              onClick={() => handleOptionChange(option)}
              role="option"
              aria-selected={selectedOption === option}
              ref={selectedOption === option ? selectedOptionRef : null}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;

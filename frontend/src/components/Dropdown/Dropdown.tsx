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
    <div className={styles['custom-dropdown-container']} ref={dropdownRef} data-testid="dropdown">
      <button
        className={styles['dropdown-toggle']}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        data-testid="dropdown-toggle"
        aria-haspopup="listbox"
        aria-expanded={isDropdownOpen}
        aria-label="Select environment"
      >
        <span data-testid="selected-option">{selectedOption}</span>
        <span className={styles['dropdown-arrow']}>{isDropdownOpen ? '▲' : '▼'}</span>
      </button>
      {isDropdownOpen && (
        <ul
          className={styles['dropdown-options']}
          role="listbox"
          data-testid="dropdown-options"
          aria-activedescendant={`env-option-${selectedOption.toLowerCase()}`}
        >
          {options.map((option) => (
            <li
              key={option}
              id={`env-option-${option.toLowerCase()}`}
              className={`${styles['dropdown-option']} ${selectedOption === option ? styles['selected'] : ''}`}
              onClick={() => handleOptionChange(option)}
              role="option"
              data-testid="option"
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

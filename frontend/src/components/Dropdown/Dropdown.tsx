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
  }, []);

  // Scroll selected option into view
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
    } else if (event.key === 'ArrowDown' && isDropdownOpen) {
      event.preventDefault();
      const currentIndex = options.indexOf(selectedOption);
      const nextIndex = (currentIndex + 1) % options.length;
      onOptionChange(options[nextIndex]);
    } else if (event.key === 'ArrowUp' && isDropdownOpen) {
      event.preventDefault();
      const currentIndex = options.indexOf(selectedOption);
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      onOptionChange(options[prevIndex]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsDropdownOpen(!isDropdownOpen);
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
        <span className={`${styles['dropdown-arrow']} ${isDropdownOpen ? styles['open'] : ''}`}>
          {isDropdownOpen ? '▲' : '▼'}
        </span>
      </button>
      {isDropdownOpen && (
        <ul
          className={styles['dropdown-options']}
          data-testid="dropdown-options"
          role="listbox"
          aria-activedescendant={`env-option-${selectedOption.toLowerCase()}`}
          tabIndex={-1}
        >
          {options.map((option) => (
            <li
              key={option}
              id={`env-option-${option.toLowerCase()}`}
              className={`${styles['dropdown-option']} ${selectedOption === option ? styles['selected'] : ''}`}
              onClick={() => handleOptionChange(option)}
              data-testid="option"
              ref={selectedOption === option ? selectedOptionRef : null}
              role="option"
              aria-selected={selectedOption === option}
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

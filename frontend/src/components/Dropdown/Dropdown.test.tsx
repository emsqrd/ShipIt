import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Dropdown from './Dropdown';

function renderDropdown(
  mockOptions = ['Option 1', 'Option 2', 'Option 3'],
  selectedOption = 'Option 1',
  storageKey = 'testDropdown',
) {
  const handleOptionChange = vi.fn();
  const result = render(
    <Dropdown
      options={mockOptions}
      selectedOption={selectedOption}
      storageKey={storageKey}
      onOptionChange={handleOptionChange}
    />,
  );

  return { ...result, handleOptionChange };
}

function openDropdown() {
  const dropdownToggle = screen.getByTestId('dropdown-toggle');
  fireEvent.click(dropdownToggle);
  return dropdownToggle;
}

describe('Dropdown component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('rendering behavior', () => {
    it('renders the dropdown component', () => {
      renderDropdown();

      const component = screen.getByTestId('dropdown');
      expect(component).toBeInTheDocument();
    });

    it('renders with the selected option when provided', () => {
      renderDropdown();

      const selectedOptionElement = screen.getByTestId('selected-option');
      expect(selectedOptionElement).toHaveTextContent('Option 1');
    });

    it('opens the dropdown menu when clicked', () => {
      const mockOptions = ['Option 1', 'Option 2', 'Option 3'];
      renderDropdown(mockOptions);

      // Initial state - dropdown should be closed
      expect(screen.queryByTestId('option')).not.toBeInTheDocument();

      // Click to open
      openDropdown();

      // Dropdown should now be open
      const dropdownOptions = screen.getAllByTestId('option');
      expect(dropdownOptions.length).toBe(mockOptions.length);
    });

    it('displays the correct options when opened', () => {
      const mockOptions = ['Option 1', 'Option 2', 'Option 3'];
      renderDropdown(mockOptions);

      // Open the dropdown
      openDropdown();

      // Check each option matches the expected text
      const dropdownOptions = screen.getAllByTestId('option');
      dropdownOptions.forEach((optionText, index) => {
        expect(optionText).toHaveTextContent(mockOptions[index]);
      });
    });
  });

  describe('interaction behavior', () => {
    it('calls onOptionChange when an option is clicked', () => {
      const { handleOptionChange } = renderDropdown();

      // Open the dropdown
      openDropdown();

      // Click on the second option
      const option = screen.getAllByTestId('option')[1];
      fireEvent.click(option);

      // Check that onOptionChange was called with the correct option
      expect(handleOptionChange).toHaveBeenCalledWith('Option 2');
    });

    it('closes the dropdown after selecting an option', () => {
      renderDropdown();

      // Open dropdown
      openDropdown();

      // Verify dropdown is open
      expect(screen.getAllByTestId('option').length).toBeGreaterThan(0);

      // Select an option
      const option = screen.getAllByTestId('option')[1];
      fireEvent.click(option);

      // Verify dropdown is closed
      expect(screen.queryAllByTestId('option').length).toBe(0);
    });

    it('closes dropdown on Escape keypress', () => {
      renderDropdown();

      // Open dropdown
      const dropdownToggle = openDropdown();

      // Verify dropdown is open
      expect(screen.getAllByTestId('option').length).toBeGreaterThan(0);

      // Press Escape on the dropdown toggle button
      fireEvent.keyDown(dropdownToggle, { key: 'Escape', code: 'Escape' });

      // Dropdown should be closed
      expect(screen.queryAllByTestId('option').length).toBe(0);
    });

    it('closes dropdown when clicking outside of the dropdown', () => {
      // Render an outside element
      render(<div data-testid="outside-element">Outside Element</div>);

      // Render the dropdown separately
      renderDropdown();

      // Open dropdown
      openDropdown();

      // Verify dropdown is open
      expect(screen.getAllByTestId('option').length).toBeGreaterThan(0);

      // Find and click on the element outside the dropdown
      const outsideElement = screen.getByTestId('outside-element');
      fireEvent.mouseDown(outsideElement);

      // Dropdown should be closed
      expect(screen.queryAllByTestId('option').length).toBe(0);
    });
  });
});

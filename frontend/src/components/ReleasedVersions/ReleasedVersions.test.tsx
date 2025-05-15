import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReleasedVersions from './ReleasedVersions';

const ENVIRONMENT_OPTIONS = ['DEV', 'INT', 'UAT', 'PERF1', 'PERF2', 'PROD1', 'PROD2'];

const mocks = vi.hoisted(() => {
  return {
    mockReleasedVersionsList: vi.fn(() => (
      <div data-testid="released-versions-list">Mocked ReleasedVersionsList</div>
    )),
    mockDropdown: vi.fn(() => <div data-testid="environment-selector">Mocked Dropdown</div>),
  };
});

// Mock the components with the spies
vi.mock('../ReleasedVersionsList/ReleasedVersionsList', () => ({
  default: mocks.mockReleasedVersionsList,
}));

vi.mock('../Dropdown/Dropdown', () => ({
  default: mocks.mockDropdown,
}));

describe('ReleasedVersions component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  });

  describe('ReleasedVersions header', () => {
    it('renders the heading', () => {
      render(<ReleasedVersions />);
      const heading = screen.getByRole('heading', { name: /released versions/i });
      expect(heading).toBeInTheDocument();
    });

    it('renders the description', () => {
      render(<ReleasedVersions />);
      const description = screen.getByText(/track all version releases across repositories/i);
      expect(description).toBeInTheDocument();
    });
  });

  describe('ReleasedVersionsList', () => {
    it('renders the ReleasedVersionsList component', () => {
      render(<ReleasedVersions />);
      const list = screen.getByTestId('released-versions-list');
      expect(list).toBeInTheDocument();
    });

    it('passes the correct props to ReleasedVersionsList', () => {
      render(<ReleasedVersions />);

      expect(mocks.mockReleasedVersionsList).toHaveBeenCalledWith(
        { environment: 'UAT' },
        undefined,
      );
    });
  });

  describe('Environment Dropdown', () => {
    it('renders the environment dropdown', () => {
      render(<ReleasedVersions />);
      const dropdown = screen.getByTestId('environment-selector');
      expect(dropdown).toBeInTheDocument();
    });

    it('passes the correct props to Dropdown', () => {
      render(<ReleasedVersions />);

      expect(mocks.mockDropdown).toHaveBeenCalledWith(
        {
          options: ENVIRONMENT_OPTIONS,
          selectedOption: 'UAT',
          storageKey: 'selectedEnvironment',
          onOptionChange: expect.any(Function),
        },
        undefined,
      );
    });
  });

  describe('Local storage functionality', () => {
    it('gets the selected environment from localStorage when available', () => {
      const savedEnv = 'UAT';
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(savedEnv);

      render(<ReleasedVersions />);

      // Verify the selected environment was passed to child components
      expect(mocks.mockReleasedVersionsList).toHaveBeenCalledWith(
        { environment: savedEnv },
        undefined,
      );

      expect(mocks.mockDropdown).toHaveBeenCalledWith(
        {
          options: ENVIRONMENT_OPTIONS,
          selectedOption: savedEnv,
          storageKey: 'selectedEnvironment',
          onOptionChange: expect.any(Function),
        },
        undefined,
      );
    });

    it('uses the default environment when localStorage value is not in allowed environments', () => {
      const invalidEnv = 'INVALID_ENV';
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(invalidEnv);

      render(<ReleasedVersions />);

      // Should fall back to the default environment
      expect(mocks.mockReleasedVersionsList).toHaveBeenCalledWith(
        { environment: 'UAT' },
        undefined,
      );

      expect(mocks.mockDropdown).toHaveBeenCalledWith(
        {
          options: ENVIRONMENT_OPTIONS,
          selectedOption: 'UAT',
          storageKey: 'selectedEnvironment',
          onOptionChange: expect.any(Function),
        },
        undefined,
      );
    });

    it('uses the default environment when localStorage is empty', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      render(<ReleasedVersions />);

      // Should use the default environment
      expect(mocks.mockReleasedVersionsList).toHaveBeenCalledWith(
        { environment: 'UAT' },
        undefined,
      );
    });
  });
});

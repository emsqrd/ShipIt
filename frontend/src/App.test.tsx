import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from './App';

// Mock the ReleasedVersions component
vi.mock('./components/ReleasedVersions/ReleasedVersions', () => ({
  default: () => <div data-testid="released-versions">Mocked ReleasedVersions</div>,
}));

describe('App', () => {
  it('renders the ReleasedVersions component', () => {
    render(<App />);
    expect(screen.getByTestId('released-versions')).toBeInTheDocument();
  });
});

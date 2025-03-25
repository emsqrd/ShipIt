import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ReleasedVersions from './ReleasedVersions';

// Mock the child component to isolate testing
vi.mock('../ReleasedVersionsList/ReleasedVersionsList', () => ({
  default: () => <div data-testid="released-versions-list">Mocked ReleasedVersionsList</div>,
}));

describe('ReleasedVersions component', () => {
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

  it('renders the ReleasedVersionsList component', () => {
    render(<ReleasedVersions />);
    const list = screen.getByTestId('released-versions-list');
    expect(list).toBeInTheDocument();
  });
});

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

// Mock React modules
vi.mock('react-dom/client');
vi.mock('./App', () => ({
  default: () => <div data-testid="mock-app">Mock App Component</div>,
}));

describe('main.tsx', () => {
  const mockRoot = {
    render: vi.fn(),
    unmount: vi.fn(),
  };

  beforeEach(() => {
    // Mock the DOM element
    document.body.innerHTML = '<div id="root"></div>';

    // Mock createRoot to return our mockRoot
    vi.mocked(ReactDOM.createRoot).mockReturnValue(mockRoot as ReactDOM.Root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should render the App component inside StrictMode', async () => {
    // Import main to trigger the code execution
    await import('./main');

    // Verify createRoot was called with the root element
    expect(ReactDOM.createRoot).toHaveBeenCalledWith(document.getElementById('root'));

    // Verify render was called on the root
    expect(mockRoot.render).toHaveBeenCalledTimes(1);

    // Capture the rendered JSX by getting the first argument of the render call
    const renderedJSX = mockRoot.render.mock.calls[0][0];

    // Verify the structure: StrictMode wrapping App
    expect(renderedJSX.type).toBe(StrictMode);
    expect(renderedJSX.props.children.type).toBe(App);
  });
});

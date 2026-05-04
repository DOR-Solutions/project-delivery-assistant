import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ projects: [] }),
    })
  );
});

describe('App', () => {
  it('renders the header', () => {
    render(<App />);
    expect(screen.getByText('Project Delivery Assistant')).toBeInTheDocument();
  });

  it('renders the projects section', () => {
    render(<App />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders the assistant section', () => {
    render(<App />);
    expect(screen.getByText('Assistant')).toBeInTheDocument();
  });

  it('renders the chat input', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });
});

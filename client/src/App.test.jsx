import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (url.includes('/api/dashboard')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          stats: { totalProjects: 4, inProgress: 1, atRisk: 1, completed: 1, totalBudget: 250000, totalSpent: 120250, budgetUtilization: 48, taskCompletion: 30, completedTasks: 3, totalTasks: 10, teamSize: 12 },
          upcomingMilestones: [],
        }),
      });
    }
    if (url.includes('/api/projects')) {
      return Promise.resolve({ json: () => Promise.resolve({ projects: [] }) });
    }
    if (url.includes('/api/tasks')) {
      return Promise.resolve({ json: () => Promise.resolve({ tasks: [] }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
});

describe('App', () => {
  it('renders the header', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders navigation tabs', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('renders the AI assistant panel', () => {
    render(<App />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders the chat input', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/Ask about projects/)).toBeInTheDocument();
  });
});

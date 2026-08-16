import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./lib/auth', () => ({
  getCurrentUserId: vi.fn(),
  onAuthStateChange: vi.fn(() => () => {}),
  logOut: vi.fn(),
}));
vi.mock('./lib/api/profiles', () => ({
  createDogProfile: vi.fn(),
  createAdopterProfile: vi.fn(),
  updateDogProfile: vi.fn(),
  updateAdopterProfile: vi.fn(),
  fetchProfile: vi.fn(),
}));
vi.mock('./lib/api/swipes', () => ({
  fetchDeck: vi.fn().mockResolvedValue([]),
  recordSwipe: vi.fn(),
}));
vi.mock('./lib/api/matches', () => ({
  fetchAcceptedMatches: vi.fn().mockResolvedValue([]),
  respondToMatch: vi.fn(),
  unmatchMatch: vi.fn(),
  markAdopted: vi.fn(),
}));
vi.mock('./lib/api/messages', () => ({
  fetchMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn(),
}));

import App from './App';
import { getCurrentUserId } from './lib/auth';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the landing page and navigates to profile creation', async () => {
    (getCurrentUserId as any).mockResolvedValue('user-1');
    render(<App />);
    expect(await screen.findByRole('heading', { name: "Fetch'd" })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');

    await userEvent.click(screen.getByText("I'm a Dog"));
    expect(screen.getByText('Create an intake profile')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/join/dog');
  });

  it('redirects an unauthenticated visit to a protected route back to login', async () => {
    (getCurrentUserId as any).mockResolvedValue(null);
    window.history.pushState({}, '', '/discover');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});

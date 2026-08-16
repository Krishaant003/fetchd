import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./lib/auth', () => ({
  getCurrentUserId: vi.fn(),
  onAuthStateChange: vi.fn(() => () => {}),
  logIn: vi.fn(),
  logOut: vi.fn(),
}));
vi.mock('./lib/api/profiles', () => ({
  createDogProfile: vi.fn(),
  createAdopterProfile: vi.fn(),
  updateDogProfile: vi.fn(),
  updateAdopterProfile: vi.fn(),
  fetchProfile: vi.fn().mockResolvedValue({
    id: 'placeholder-id',
    user_id: 'user-1',
    name: 'Placeholder',
    answer_1: 'a',
    answer_2: 'b',
    answer_3: 'c',
    answer_4: 'd',
    answer_5: 'e',
    created_at: '',
  }),
  fetchOwnedProfiles: vi.fn(),
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
import { getCurrentUserId, onAuthStateChange, logIn } from './lib/auth';
import { fetchOwnedProfiles, fetchProfile } from './lib/api/profiles';

const ACTIVE_PROFILE_KEY = 'dogmatch_active_profile';

async function logInThroughForm() {
  render(<App />);
  await userEvent.type(await screen.findByLabelText('username'), 'alice');
  await userEvent.type(screen.getByLabelText('password'), 'secret123');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on landing page navigates profile creation', async () => {
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

  it('clears a stale cached profile and stays on landing when login finds zero owned profiles', async () => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify({ type: 'dog', id: 'stale-id' }));

    let authCallback: ((id: string | null) => void) | null = null;
    (onAuthStateChange as any).mockImplementation((cb: (id: string | null) => void) => {
      authCallback = cb;
      return () => {};
    });
    (getCurrentUserId as any).mockResolvedValueOnce(null).mockResolvedValue('user-1');
    (logIn as any).mockImplementation(async () => {
      authCallback?.('user-1');
    });
    (fetchOwnedProfiles as any).mockResolvedValueOnce([]);

    window.history.pushState({}, '', '/login');
    await logInThroughForm();

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(localStorage.getItem(ACTIVE_PROFILE_KEY)).toBeNull();
  });

  it('clears a stale cached profile and routes to /discover when login finds exactly one owned profile', async () => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify({ type: 'dog', id: 'stale-id' }));

    let authCallback: ((id: string | null) => void) | null = null;
    (onAuthStateChange as any).mockImplementation((cb: (id: string | null) => void) => {
      authCallback = cb;
      return () => {};
    });
    (getCurrentUserId as any).mockResolvedValueOnce(null).mockResolvedValue('user-1');
    (logIn as any).mockImplementation(async () => {
      authCallback?.('user-1');
    });
    (fetchOwnedProfiles as any).mockResolvedValueOnce([{ type: 'adopter', id: 'fresh-id' }]);
    (fetchProfile as any).mockResolvedValue({
      id: 'fresh-id',
      user_id: 'user-1',
      name: 'Fresh Pup',
      answer_1: 'a',
      answer_2: 'b',
      answer_3: 'c',
      answer_4: 'd',
      answer_5: 'e',
      created_at: '',
    });

    window.history.pushState({}, '', '/login');
    await logInThroughForm();

    await waitFor(() => expect(window.location.pathname).toBe('/discover'));
    expect(JSON.parse(localStorage.getItem(ACTIVE_PROFILE_KEY)!)).toEqual({ type: 'adopter', id: 'fresh-id' });
  });

  it('clears a stale cached profile and stays on landing when login finds multiple owned profiles', async () => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify({ type: 'dog', id: 'stale-id' }));

    let authCallback: ((id: string | null) => void) | null = null;
    (onAuthStateChange as any).mockImplementation((cb: (id: string | null) => void) => {
      authCallback = cb;
      return () => {};
    });
    (getCurrentUserId as any).mockResolvedValueOnce(null).mockResolvedValue('user-1');
    (logIn as any).mockImplementation(async () => {
      authCallback?.('user-1');
    });
    (fetchOwnedProfiles as any).mockResolvedValueOnce([
      { type: 'dog', id: 'dog-1' },
      { type: 'adopter', id: 'adopter-1' },
    ]);

    window.history.pushState({}, '', '/login');
    await logInThroughForm();

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(localStorage.getItem(ACTIVE_PROFILE_KEY)).toBeNull();
  });
});

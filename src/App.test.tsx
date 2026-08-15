import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the landing page and navigates to profile creation', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: "Fetch'd" })).toBeInTheDocument();

    await userEvent.click(screen.getByText("I'm a Dog"));
    expect(screen.getByText('Create an intake profile')).toBeInTheDocument();
  });
});

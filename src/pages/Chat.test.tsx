import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/messages', () => ({
  fetchMessages: vi.fn().mockResolvedValue([
    { id: 'm1', match_id: 'match-1', sender_type: 'dog', sender_id: 'd1', body: 'Hi there', created_at: '2026-08-15T00:00:00Z' },
  ]),
  sendMessage: vi.fn().mockResolvedValue({
    id: 'm2', match_id: 'match-1', sender_type: 'adopter', sender_id: 'a1', body: 'hey', created_at: '2026-08-15T00:01:00Z',
  }),
}));
vi.mock('../lib/api/matches', () => ({
  unmatchMatch: vi.fn().mockResolvedValue(undefined),
  markAdopted: vi.fn().mockResolvedValue(undefined),
}));

import { Chat } from './Chat';
import { unmatchMatch, markAdopted } from '../lib/api/matches';

const match = {
  match: { id: 'match-1', adopter_id: 'a1', dog_id: 'd1', status: 'accepted' as const, created_at: '2026-08-14T00:00:00Z' },
  dog: { id: 'd1', name: 'Biscuit', photo_urls: ['https://example.com/dog.jpg'] } as any,
  adopter: { id: 'a1', name: 'Jo', photo_urls: ['https://example.com/jo.jpg'] } as any,
};

describe('Chat', () => {
  it('loads and shows messages, and sends a new one', async () => {
    render(
      <Chat match={match} viewerProfile={{ type: 'adopter', id: 'a1' }} onBack={vi.fn()} onMatchClosed={vi.fn()} />
    );

    expect(await screen.findByText('Hi there')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('message'), 'hey');
    await userEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('hey')).toBeInTheDocument();
  });

  it('unmatches and calls onMatchClosed', async () => {
    const onMatchClosed = vi.fn();
    render(
      <Chat match={match} viewerProfile={{ type: 'adopter', id: 'a1' }} onBack={vi.fn()} onMatchClosed={onMatchClosed} />
    );

    await userEvent.click(screen.getByText('Unmatch'));

    expect(unmatchMatch).toHaveBeenCalledWith('match-1');
    await waitFor(() => expect(onMatchClosed).toHaveBeenCalled());
  });

  it('marks adopted and calls onMatchClosed', async () => {
    const onMatchClosed = vi.fn();
    render(
      <Chat match={match} viewerProfile={{ type: 'adopter', id: 'a1' }} onBack={vi.fn()} onMatchClosed={onMatchClosed} />
    );

    await userEvent.click(screen.getByText('Mark adopted'));

    expect(markAdopted).toHaveBeenCalledWith('match-1');
    await waitFor(() => expect(onMatchClosed).toHaveBeenCalled());
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/matches', () => ({
  respondToMatch: vi.fn().mockResolvedValue(undefined),
}));

import { MatchPrompt } from './MatchPrompt';
import { respondToMatch } from '../lib/api/matches';

describe('MatchPrompt', () => {
  it('accepts the match and calls onResolved', async () => {
    const onResolved = vi.fn();
    render(<MatchPrompt matchId="match-1" onResolved={onResolved} />);

    await userEvent.click(screen.getByText('Accept'));

    expect(respondToMatch).toHaveBeenCalledWith('match-1', 'accepted');
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });

  it('rejects the match and calls onResolved', async () => {
    const onResolved = vi.fn();
    render(<MatchPrompt matchId="match-1" onResolved={onResolved} />);

    await userEvent.click(screen.getByText('Not now'));

    expect(respondToMatch).toHaveBeenCalledWith('match-1', 'rejected');
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });
});

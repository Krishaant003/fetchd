import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/matches', () => ({
  respondToMatch: vi.fn().mockResolvedValue(undefined),
}));

import { MatchPrompt } from './MatchPrompt';
import { respondToMatch } from '../lib/api/matches';

describe('MatchPrompt', () => {
  it('shows the other party name and accepts the match', async () => {
    const onResolved = vi.fn();
    render(<MatchPrompt matchId="match-1" otherName="Biscuit" onResolved={onResolved} />);

    expect(screen.getByText('You and Biscuit both said yes')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Confirm match'));

    expect(respondToMatch).toHaveBeenCalledWith('match-1', 'accepted');
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });

  it('rejects the match and calls onResolved', async () => {
    const onResolved = vi.fn();
    render(<MatchPrompt matchId="match-1" otherName="Biscuit" onResolved={onResolved} />);

    await userEvent.click(screen.getByText('Not this time'));

    expect(respondToMatch).toHaveBeenCalledWith('match-1', 'rejected');
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });
});

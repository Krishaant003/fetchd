import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { dog } = vi.hoisted(() => ({
  dog: {
    id: 'd1',
    session_id: 's1',
    name: 'Rex',
    breed: 'Mutt',
    age: '2',
    photo_urls: [
      'https://example.com/rex1.jpg',
      'https://example.com/rex2.jpg',
      'https://example.com/rex3.jpg',
      'https://example.com/rex4.jpg',
    ],
    answer_1: 'Loves parks',
    answer_2: 'High energy',
    answer_3: 'Friendly',
    answer_4: 'No known fears',
    answer_5: 'A home with a yard',
    created_at: '2026-08-15T00:00:00Z',
  },
}));

vi.mock('../lib/api/swipes', () => ({
  fetchDeck: vi.fn().mockResolvedValue([dog]),
  recordSwipe: vi.fn().mockResolvedValue({ matchId: 'match-1' }),
}));
vi.mock('../lib/gemini', () => ({
  generateCompatibilityNote: vi.fn().mockResolvedValue('You both love the outdoors.'),
}));

import { SwipeDeck } from './SwipeDeck';
import { recordSwipe } from '../lib/api/swipes';

describe('SwipeDeck', () => {
  it('loads the deck, shows the note, and reports a match on right-swipe', async () => {
    const onMatch = vi.fn();
    render(
      <SwipeDeck
        activeProfile={{ type: 'adopter', id: 'a1' }}
        viewerText="I love hiking"
        onMatch={onMatch}
      />
    );

    expect(await screen.findByText('Rex')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('You both love the outdoors.')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Interested'));

    expect(recordSwipe).toHaveBeenCalledWith('adopter', 'a1', 'dog', 'd1', 'right');
    await waitFor(() => expect(onMatch).toHaveBeenCalledWith('match-1', 'Rex'));
  });
});

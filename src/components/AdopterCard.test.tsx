import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdopterCard } from './AdopterCard';

const adopter = {
  id: 'a1',
  session_id: 's1',
  name: 'Jo',
  photo_urls: [
    'https://example.com/jo1.jpg',
    'https://example.com/jo2.jpg',
    'https://example.com/jo3.jpg',
    'https://example.com/jo4.jpg',
  ] as [string, string, string, string],
  answer_1: 'Runs every morning near the park.',
  answer_2: 'Work from home most days.',
  answer_3: 'No other pets.',
  answer_4: 'Grew up with dogs.',
  answer_5: 'A loyal running buddy.',
  created_at: '2026-08-15T00:00:00Z',
};

describe('AdopterCard', () => {
  it('shows the name and all 5 answers', () => {
    render(<AdopterCard adopter={adopter} />);
    expect(screen.getByText('Jo')).toBeInTheDocument();
    expect(screen.getByText(/Runs every morning/)).toBeInTheDocument();
    expect(screen.getByText('A loyal running buddy.')).toBeInTheDocument();
  });

  it('starts on the first photo and advances on click', async () => {
    const { container } = render(<AdopterCard adopter={adopter} />);
    const img = () => container.querySelector('img') as HTMLImageElement;
    expect(img().src).toBe('https://example.com/jo1.jpg');

    await userEvent.click(screen.getByLabelText('Next photo'));
    expect(img().src).toBe('https://example.com/jo2.jpg');
  });
});

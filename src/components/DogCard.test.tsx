import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DogCard } from './DogCard';

const dog = {
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
  ] as [string, string, string, string],
  answer_1: 'Loves parks',
  answer_2: 'High energy',
  answer_3: 'Friendly with everyone',
  answer_4: 'Afraid of thunder',
  answer_5: 'A home with a yard',
  created_at: '2026-08-15T00:00:00Z',
};

describe('DogCard', () => {
  it('shows the name, breed/age, and all 5 answers', () => {
    render(<DogCard dog={dog} />);
    expect(screen.getByText('Rex')).toBeInTheDocument();
    expect(screen.getByText('Mutt · 2')).toBeInTheDocument();
    expect(screen.getByText('Loves parks')).toBeInTheDocument();
    expect(screen.getByText('A home with a yard')).toBeInTheDocument();
  });

  it('starts on the first photo and cycles forward/backward through all 4', async () => {
    const { container } = render(<DogCard dog={dog} />);
    const img = () => container.querySelector('img') as HTMLImageElement;
    expect(img().src).toBe('https://example.com/rex1.jpg');

    await userEvent.click(screen.getByLabelText('Next photo'));
    expect(img().src).toBe('https://example.com/rex2.jpg');

    await userEvent.click(screen.getByLabelText('Previous photo'));
    expect(img().src).toBe('https://example.com/rex1.jpg');

    await userEvent.click(screen.getByLabelText('Previous photo'));
    expect(img().src).toBe('https://example.com/rex4.jpg');
  });
});

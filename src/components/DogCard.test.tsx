import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DogCard } from './DogCard';

const dog = {
  id: 'd1',
  session_id: 's1',
  name: 'Rex',
  breed: 'Mutt',
  age: '2',
  story: 'Loves parks',
  photo_url: 'https://example.com/rex.jpg',
  created_at: '2026-08-15T00:00:00Z',
};

describe('DogCard', () => {
  it('shows the dog details and a loading state for the note', () => {
    render(<DogCard dog={dog} noteLoading={true} />);
    expect(screen.getByText('Rex')).toBeInTheDocument();
    expect(screen.getByText(/Mutt/)).toBeInTheDocument();
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });

  it('shows the resolved note once loaded', () => {
    render(<DogCard dog={dog} note="Both of you love the outdoors." noteLoading={false} />);
    expect(screen.getByText('Both of you love the outdoors.')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdopterCard } from './AdopterCard';

const adopter = {
  id: 'a1',
  session_id: 's1',
  name: 'Jo',
  photo_url: 'https://example.com/jo.jpg',
  lifestyle_text: 'Runs every morning near the park.',
  created_at: '2026-08-15T00:00:00Z',
};

describe('AdopterCard', () => {
  it('shows the adopter details and a loading state for the note', () => {
    render(<AdopterCard adopter={adopter} noteLoading={true} />);
    expect(screen.getByText('Jo')).toBeInTheDocument();
    expect(screen.getByText(/Runs every morning/)).toBeInTheDocument();
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });

  it('shows the resolved note once loaded', () => {
    render(<AdopterCard adopter={adopter} note="You both like early mornings outside." noteLoading={false} />);
    expect(screen.getByText('You both like early mornings outside.')).toBeInTheDocument();
  });
});

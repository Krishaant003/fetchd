import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/api/matches', () => ({
  fetchAcceptedMatches: vi.fn().mockResolvedValue([
    {
      match: { id: 'm1', adopter_id: 'a1', dog_id: 'd1', status: 'accepted', created_at: '2026-08-15T00:00:00Z' },
      dog: { id: 'd1', name: 'Rex', photo_url: 'https://example.com/rex.jpg' },
      adopter: { id: 'a1', name: 'Jo', photo_url: 'https://example.com/jo.jpg' },
    },
  ]),
}));

import { MatchedSection } from './MatchedSection';

describe('MatchedSection', () => {
  it('shows the matched dog name for an adopter viewer', async () => {
    render(<MatchedSection activeProfile={{ type: 'adopter', id: 'a1' }} />);
    expect(await screen.findByText('Rex')).toBeInTheDocument();
  });
});

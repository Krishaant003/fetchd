import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/matches', () => ({
  fetchAcceptedMatches: vi.fn().mockResolvedValue([
    {
      match: { id: 'm1', adopter_id: 'a1', dog_id: 'd1', status: 'accepted', created_at: '2026-08-15T00:00:00Z' },
      dog: { id: 'd1', name: 'Rex', photo_urls: ['https://example.com/rex.jpg'] },
      adopter: { id: 'a1', name: 'Jo', photo_urls: ['https://example.com/jo.jpg'] },
    },
  ]),
}));

import { MatchedSection } from './MatchedSection';

describe('MatchedSection', () => {
  it('shows the matched dog name for an adopter viewer', async () => {
    render(<MatchedSection activeProfile={{ type: 'adopter', id: 'a1' }} onOpenMatch={vi.fn()} />);
    expect(await screen.findByText('Rex')).toBeInTheDocument();
  });

  it('calls onOpenMatch with the accepted match when clicked', async () => {
    const onOpenMatch = vi.fn();
    render(<MatchedSection activeProfile={{ type: 'adopter', id: 'a1' }} onOpenMatch={onOpenMatch} />);

    await userEvent.click(await screen.findByText('Rex'));

    expect(onOpenMatch).toHaveBeenCalledWith(
      expect.objectContaining({ match: expect.objectContaining({ id: 'm1' }) })
    );
  });
});

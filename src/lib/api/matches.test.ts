import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabaseClient', () => ({ supabase: { from: vi.fn() } }));

import { supabase } from '../../supabaseClient';
import { respondToMatch, fetchAcceptedMatches, unmatchMatch, markAdopted } from './matches';

describe('respondToMatch', () => {
  it('updates the match status', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    (supabase.from as any) = vi.fn(() => ({ update }));

    await respondToMatch('match-1', 'accepted');

    expect(update).toHaveBeenCalledWith({ status: 'accepted' });
    expect(eq).toHaveBeenCalledWith('id', 'match-1');
  });
});

describe('fetchAcceptedMatches', () => {
  it('returns accepted matches for the viewer with joined profiles', async () => {
    const eq2 = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'match-1',
          adopter_id: 'a1',
          dog_id: 'd1',
          status: 'accepted',
          created_at: '2026-08-15T00:00:00Z',
          dog: { id: 'd1', name: 'Rex' },
          adopter: { id: 'a1', name: 'Jo' },
        },
      ],
      error: null,
    });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    (supabase.from as any) = vi.fn(() => ({ select }));

    const matches = await fetchAcceptedMatches('adopter', 'a1');

    expect(matches).toHaveLength(1);
    expect(matches[0].dog.name).toBe('Rex');
    expect(eq1).toHaveBeenCalledWith('adopter_id', 'a1');
  });
});

describe('unmatchMatch', () => {
  it('sets the match status to unmatched', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    (supabase.from as any) = vi.fn(() => ({ update }));

    await unmatchMatch('match-1');

    expect(update).toHaveBeenCalledWith({ status: 'unmatched' });
    expect(eq).toHaveBeenCalledWith('id', 'match-1');
  });
});

describe('markAdopted', () => {
  it('sets the match status to adopted', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    (supabase.from as any) = vi.fn(() => ({ update }));

    await markAdopted('match-1');

    expect(update).toHaveBeenCalledWith({ status: 'adopted' });
    expect(eq).toHaveBeenCalledWith('id', 'match-1');
  });
});

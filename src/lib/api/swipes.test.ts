import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabaseClient', () => ({ supabase: { from: vi.fn() } }));

import { supabase } from '../../supabaseClient';
import { recordSwipe } from './swipes';

describe('recordSwipe', () => {
  it('returns no match when swiping left', async () => {
    const swipeInsert = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as any) = vi.fn(() => ({ insert: swipeInsert }));

    const result = await recordSwipe('adopter', 'a1', 'dog', 'd1', 'left');

    expect(result.matchId).toBeNull();
    expect(swipeInsert).toHaveBeenCalledWith({
      swiper_id: 'a1',
      swiper_type: 'adopter',
      target_id: 'd1',
      target_type: 'dog',
      direction: 'left',
    });
  });

  it('creates a pending match when the target already swiped right', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'swipe-1' }, error: null });
    const eq5 = vi.fn().mockReturnValue({ maybeSingle });
    const eq4 = vi.fn().mockReturnValue({ eq: eq5 });
    const eq3 = vi.fn().mockReturnValue({ eq: eq4 });
    const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });

    const matchSingle = vi.fn().mockResolvedValue({ data: { id: 'match-1' }, error: null });
    const matchSelect = vi.fn().mockReturnValue({ single: matchSingle });
    const matchInsert = vi.fn().mockReturnValue({ select: matchSelect });

    const swipeInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any) = vi.fn((table: string) => {
      if (table === 'swipes') return { insert: swipeInsert, select };
      if (table === 'matches') return { insert: matchInsert };
      throw new Error(`unexpected table ${table}`);
    });

    const result = await recordSwipe('adopter', 'a1', 'dog', 'd1', 'right');

    expect(result.matchId).toBe('match-1');
    expect(matchInsert).toHaveBeenCalledWith({ adopter_id: 'a1', dog_id: 'd1', status: 'pending' });
  });
});

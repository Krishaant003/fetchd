import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabaseClient', () => ({ supabase: { from: vi.fn() } }));

import { supabase } from '../../supabaseClient';
import { fetchMessages, sendMessage } from './messages';

describe('fetchMessages', () => {
  it('returns messages for a match ordered by created_at', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'm1', match_id: 'match-1', sender_type: 'adopter', sender_id: 'a1', body: 'hi', created_at: '2026-08-15T00:00:00Z' }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    (supabase.from as any) = vi.fn(() => ({ select }));

    const messages = await fetchMessages('match-1');

    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe('hi');
    expect(eq).toHaveBeenCalledWith('match_id', 'match-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
  });
});

describe('sendMessage', () => {
  it('inserts a message and returns it', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'm2', match_id: 'match-1', sender_type: 'dog', sender_id: 'd1', body: 'hey', created_at: '2026-08-15T00:01:00Z' },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    (supabase.from as any) = vi.fn(() => ({ insert }));

    const message = await sendMessage('match-1', 'dog', 'd1', 'hey');

    expect(insert).toHaveBeenCalledWith({ match_id: 'match-1', sender_type: 'dog', sender_id: 'd1', body: 'hey' });
    expect(message.body).toBe('hey');
  });
});

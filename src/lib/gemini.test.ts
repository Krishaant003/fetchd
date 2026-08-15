import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCompatibilityNote } from './gemini';

describe('generateCompatibilityNote', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns the text from the Gemini response', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'You both love long walks.' }] } }],
      }),
    });

    const note = await generateCompatibilityNote('I love hiking', 'Loves trails');
    expect(note).toBe('You both love long walks.');
  });

  it('throws when the request fails', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 500 });
    await expect(generateCompatibilityNote('a', 'b')).rejects.toThrow();
  });
});

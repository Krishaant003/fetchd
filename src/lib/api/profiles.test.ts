import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabaseClient', () => {
  const upload = vi.fn().mockResolvedValue({ error: null });
  let callCount = 0;
  const getPublicUrl = vi.fn().mockImplementation(() => {
    callCount += 1;
    return { data: { publicUrl: `https://example.com/photo-${callCount}.jpg` } };
  });
  const single = vi.fn().mockResolvedValue({
    data: {
      id: 'dog-1',
      session_id: 's1',
      name: 'Rex',
      breed: 'Mutt',
      age: '2',
      photo_urls: ['https://example.com/photo-1.jpg', 'https://example.com/photo-2.jpg', 'https://example.com/photo-3.jpg', 'https://example.com/photo-4.jpg'],
      answer_1: 'a1',
      answer_2: 'a2',
      answer_3: 'a3',
      answer_4: 'a4',
      answer_5: 'a5',
    },
    error: null,
  });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  return {
    supabase: {
      storage: { from: vi.fn().mockReturnValue({ upload, getPublicUrl }) },
      from: vi.fn().mockReturnValue({ insert }),
    },
  };
});

import { createDogProfile } from './profiles';

describe('createDogProfile', () => {
  it('uploads all 4 photos and inserts a dog row with 5 answers', async () => {
    const photos = [
      new File(['1'], 'rex1.jpg', { type: 'image/jpeg' }),
      new File(['2'], 'rex2.jpg', { type: 'image/jpeg' }),
      new File(['3'], 'rex3.jpg', { type: 'image/jpeg' }),
      new File(['4'], 'rex4.jpg', { type: 'image/jpeg' }),
    ] as [File, File, File, File];

    const dog = await createDogProfile({
      session_id: 's1',
      name: 'Rex',
      breed: 'Mutt',
      age: '2',
      answers: ['a1', 'a2', 'a3', 'a4', 'a5'],
      photos,
    });

    expect(dog.name).toBe('Rex');
    expect(dog.photo_urls).toHaveLength(4);
    expect(dog.answer_1).toBe('a1');
  });
});

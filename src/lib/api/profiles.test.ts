import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabaseClient', () => {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } });
  const single = vi.fn().mockResolvedValue({
    data: {
      id: 'dog-1',
      session_id: 's1',
      name: 'Rex',
      breed: 'Mutt',
      age: '2',
      story: 'Loves parks',
      photo_url: 'https://example.com/photo.jpg',
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
  it('uploads the photo and inserts a dog row', async () => {
    const photo = new File(['data'], 'rex.jpg', { type: 'image/jpeg' });
    const dog = await createDogProfile({
      session_id: 's1',
      name: 'Rex',
      breed: 'Mutt',
      age: '2',
      story: 'Loves parks',
      photo,
    });
    expect(dog.name).toBe('Rex');
    expect(dog.photo_url).toBe('https://example.com/photo.jpg');
  });
});

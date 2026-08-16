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
      user_id: 's1',
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

import { supabase } from '../../supabaseClient';
import { createDogProfile, fetchOwnedProfiles } from './profiles';
import { emptyIntakeFields } from '../../types';
import type { IntakeFields } from '../../types';

describe('createDogProfile', () => {
  it('uploads all 4 photos and inserts a dog row with 5 answers', async () => {
    const photos = [
      new File(['1'], 'rex1.jpg', { type: 'image/jpeg' }),
      new File(['2'], 'rex2.jpg', { type: 'image/jpeg' }),
      new File(['3'], 'rex3.jpg', { type: 'image/jpeg' }),
      new File(['4'], 'rex4.jpg', { type: 'image/jpeg' }),
    ] as [File, File, File, File];

    const dog = await createDogProfile({
      user_id: 's1',
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

describe('fetchOwnedProfiles', () => {
  it('returns dog and adopter profiles owned by the user', async () => {
    const dogsEq = vi.fn().mockResolvedValue({ data: [{ id: 'd1' }], error: null });
    const dogsSelect = vi.fn().mockReturnValue({ eq: dogsEq });
    const adoptersEq = vi.fn().mockResolvedValue({ data: [{ id: 'a1' }], error: null });
    const adoptersSelect = vi.fn().mockReturnValue({ eq: adoptersEq });

    (supabase.from as any) = vi.fn((table: string) => {
      if (table === 'dogs') return { select: dogsSelect };
      if (table === 'adopters') return { select: adoptersSelect };
      throw new Error(`unexpected table ${table}`);
    });

    const owned = await fetchOwnedProfiles('u1');

    expect(owned).toEqual([
      { type: 'dog', id: 'd1' },
      { type: 'adopter', id: 'a1' },
    ]);
    expect(dogsEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(adoptersEq).toHaveBeenCalledWith('user_id', 'u1');
  });
});

describe('createDogProfile with intake data', () => {
  it('includes intake fields on the inserted row when provided', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'dog-2' }, error: null }),
      }),
    });
    (supabase.from as any) = vi.fn().mockReturnValue({ insert });
    (supabase.storage.from as any) = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/p.jpg' } }),
    });

    const photos = [
      new File(['1'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['2'], 'b.jpg', { type: 'image/jpeg' }),
      new File(['3'], 'c.jpg', { type: 'image/jpeg' }),
      new File(['4'], 'd.jpg', { type: 'image/jpeg' }),
    ] as [File, File, File, File];

    const intake: IntakeFields = {
      ...emptyIntakeFields(),
      weight: '45 lbs',
      behavior_observations: 'anxious around loud noises',
    };

    await createDogProfile({
      user_id: 's1',
      name: 'Rex',
      breed: 'Mutt',
      age: '2',
      answers: ['a1', 'a2', 'a3', 'a4', 'a5'],
      photos,
      intake,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ weight: '45 lbs', behavior_observations: 'anxious around loud noises' })
    );
  });
});

import { describe, it, expect } from 'vitest';
import { combineAnswers, emptyIntakeFields } from './types';
import type { Dog, Adopter } from './types';

function makeDog(overrides: Partial<Dog> = {}): Dog {
  return {
    id: 'd1',
    user_id: 'u1',
    name: 'Rex',
    breed: 'Beagle mix',
    age: '3 years',
    photo_urls: ['a', 'b', 'c', 'd'],
    answer_1: 'a1',
    answer_2: 'a2',
    answer_3: 'a3',
    answer_4: 'a4',
    answer_5: 'a5',
    created_at: '2026-01-01',
    ...emptyIntakeFields(),
    ...overrides,
  };
}

function makeAdopter(): Adopter {
  return {
    id: 'a1',
    user_id: 'u1',
    name: 'Maya',
    photo_urls: ['a', 'b', 'c', 'd'],
    answer_1: 'x1',
    answer_2: 'x2',
    answer_3: 'x3',
    answer_4: 'x4',
    answer_5: 'x5',
    created_at: '2026-01-01',
  };
}

describe('combineAnswers', () => {
  it('joins only the 5 answers when a dog has no intake data', () => {
    expect(combineAnswers(makeDog())).toBe('a1 a2 a3 a4 a5');
  });

  it('formats an adopter as labeled fields', () => {
    expect(combineAnswers(makeAdopter())).toBe(
      'Home & nearby space: x1. Household: x2. Hours alone on a typical day: x3. Noise-sensitive situations: x4. Previous dog experience: x5.'
    );
  });

  it('appends a vet intake summary when a dog has compatibility-relevant intake data', () => {
    const dog = makeDog({
      weight: '45 lbs',
      spay_neuter_status: 'neutered',
      diagnosed_conditions: ['mild hip dysplasia'],
      dietary_needs_allergies: 'chicken allergy',
      behavior_observations: 'anxious around loud noises',
    });

    const text = combineAnswers(dog);

    expect(text).toContain('a1 a2 a3 a4 a5');
    expect(text).toContain('Beagle mix, age 3 years.');
    expect(text).toContain('Weight: 45 lbs.');
    expect(text).toContain('Spay/neuter status: neutered.');
    expect(text).toContain('Diagnosed conditions: mild hip dysplasia.');
    expect(text).toContain('Dietary needs: chicken allergy.');
    expect(text).toContain('Vet-observed behavior: anxious around loud noises.');
  });

  it('omits record-keeping-only intake fields from the note text', () => {
    const dog = makeDog({ weight: '45 lbs', microchip_number: '985121012345678' });
    expect(combineAnswers(dog)).not.toContain('985121012345678');
  });
});

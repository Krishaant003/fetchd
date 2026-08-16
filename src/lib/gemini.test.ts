import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCompatibilityNote, extractIntakeDocument } from './gemini';

describe('generateCompatibilityNote', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns text from Gemini response', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'You both love long walks.' }] } }],
      }),
    });

    const note = await generateCompatibilityNote('I love hiking', 'Loves trails');
    expect(note).toBe('You both love long walks.');
  });

  it('throws when request fails', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 500 });
    await expect(generateCompatibilityNote('a', 'b')).rejects.toThrow();
  });
});

describe('extractIntakeDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  const extraction = {
    dog_id: null,
    name: 'Rex',
    breed: 'Beagle mix',
    age: '3 years',
    sex: 'male',
    color: 'brown',
    intake_date: '2026-01-05',
    intake_source: 'owner surrender',
    weight: '45 lbs',
    temperature: '101.5F',
    body_condition_score: '5/9',
    exam_notes: 'healthy overall',
    vaccine_records: ['rabies', 'DHPP'],
    deworming_flea_treatment: 'Nexgard given',
    microchip_number: '985121012345678',
    spay_neuter_status: 'neutered',
    spay_neuter_date: '2025-06-01',
    current_medications: null,
    diagnosed_conditions: ['mild hip dysplasia'],
    dietary_needs_allergies: 'chicken allergy',
    behavior_observations: 'anxious around loud noises',
  };

  it('parses the JSON Gemini returns into an IntakeExtraction', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(extraction) }] } }],
      }),
    });

    const result = await extractIntakeDocument('base64imagedata', 'image/jpeg');
    expect(result).toEqual(extraction);
  });

  it('sends the image as inline data alongside the extraction prompt', async () => {
    const fetchMock = fetch as any;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(extraction) }] } }] }),
    });

    await extractIntakeDocument('base64imagedata', 'image/jpeg');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[1]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: 'base64imagedata' } });
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json' });
  });

  it('throws when the request fails', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 500 });
    await expect(extractIntakeDocument('base64imagedata', 'image/jpeg')).rejects.toThrow();
  });
});

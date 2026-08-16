# Fetch'd Shelter Document Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional shelter-side flow that photographs a vet intake document, extracts structured fields via Gemini vision, lets a staffer review/correct them before saving, stores them on `dogs`, and feeds the compatibility-relevant subset into the existing note-generation text.

**Architecture:** A new `extractIntakeDocument()` call in `src/lib/gemini.ts` sends a photographed document to Gemini and parses a strict JSON response into an `IntakeExtraction`. `CreateProfile.tsx` wires an optional file input to that call, pre-fills `name`/`breed`/`age`, and renders a new `IntakeReviewForm` component so every extracted field is editable before submit. `src/lib/api/profiles.ts` persists the reviewed fields as new nullable columns on `dogs`. `combineAnswers()` in `src/types.ts` appends a compatibility-relevant summary of those columns to a dog's profile text whenever intake data is present, so `generateCompatibilityNote` (unchanged) automatically gets richer grounding material without any change to its signature or prompt.

**Tech Stack:** React 19, TypeScript, Vite, `@supabase/supabase-js`, Gemini `generateContent` REST API (already used in `src/lib/gemini.ts`), Vitest + React Testing Library.

**Spec:** `docs/superpowers/DocumentParser.md`

## Global Constraints

- Additive only — do not change `generateCompatibilityNote`'s signature/prompt, auth, or swipe/match logic.
- Never save extracted JSON directly to the database — it must pass through an editable review form first.
- Extraction must return `null` (or `[]` for `vaccine_records`/`diagnosed_conditions`) for anything not actually on the document — never guess.
- Not every extracted field feeds the compatibility note — only `weight`, `spay_neuter_status`, `diagnosed_conditions`, `dietary_needs_allergies`, `behavior_observations` (plus `breed`/`age`, already-required fields) do; the rest is shelter record-keeping only.
- Do not remove or replace the existing `answer_1`–`answer_5` Q&A fields.
- All new `dogs` columns are nullable — a dog profile created without an intake document must behave exactly as it does today.
- Every task must pass `npm run test`, `npx tsc -b --noEmit`, and `npm run build` before committing — this is the project's established verification gate.

---

### Task 1: Database schema — intake document columns

**Files:**
- Create: `supabase/migration-intake-document.sql`
- Modify: `supabase/schema.sql:16-29` (the `create table dogs (...)` block)

**Interfaces:**
- Produces: 17 new nullable columns on `dogs` — `sex`, `color`, `intake_date`, `intake_source`, `weight`, `temperature`, `body_condition_score`, `exam_notes`, `vaccine_records`, `deworming_flea_treatment`, `microchip_number`, `spay_neuter_status`, `spay_neuter_date`, `current_medications`, `diagnosed_conditions`, `dietary_needs_allergies`, `behavior_observations`. Task 2's `IntakeFields` type mirrors this list exactly.

- [ ] **Step 1: Write the migration**

Create `supabase/migration-intake-document.sql`:

```sql
-- Adds structured intake/vet document fields to dogs, populated via the
-- Gemini extraction + review flow (docs/superpowers/DocumentParser.md).
-- All nullable: a dog profile created without an intake document is
-- unaffected.

alter table dogs
  add column sex text,
  add column color text,
  add column intake_date date,
  add column intake_source text,
  add column weight text,
  add column temperature text,
  add column body_condition_score text,
  add column exam_notes text,
  add column vaccine_records jsonb,
  add column deworming_flea_treatment text,
  add column microchip_number text,
  add column spay_neuter_status text,
  add column spay_neuter_date date,
  add column current_medications text,
  add column diagnosed_conditions text[],
  add column dietary_needs_allergies text,
  add column behavior_observations text;
```

- [ ] **Step 2: Fold the columns into `schema.sql`**

In `supabase/schema.sql`, inside the `create table dogs ( ... )` block, add the same 17 columns right after `answer_5 text not null,` and before `created_at timestamptz not null default now()`:

```sql
  answer_5 text not null,
  sex text,
  color text,
  intake_date date,
  intake_source text,
  weight text,
  temperature text,
  body_condition_score text,
  exam_notes text,
  vaccine_records jsonb,
  deworming_flea_treatment text,
  microchip_number text,
  spay_neuter_status text,
  spay_neuter_date date,
  current_medications text,
  diagnosed_conditions text[],
  dietary_needs_allergies text,
  behavior_observations text,
  created_at timestamptz not null default now()
```

- [ ] **Step 3: Verify the two files list the same 17 columns**

Run:
```bash
grep -oE '^\s*(sex|color|intake_date|intake_source|weight|temperature|body_condition_score|exam_notes|vaccine_records|deworming_flea_treatment|microchip_number|spay_neuter_status|spay_neuter_date|current_medications|diagnosed_conditions|dietary_needs_allergies|behavior_observations) ' supabase/migration-intake-document.sql | sort > /tmp/migration_cols.txt
grep -oE '^\s*(sex|color|intake_date|intake_source|weight|temperature|body_condition_score|exam_notes|vaccine_records|deworming_flea_treatment|microchip_number|spay_neuter_status|spay_neuter_date|current_medications|diagnosed_conditions|dietary_needs_allergies|behavior_observations) ' supabase/schema.sql | sort > /tmp/schema_cols.txt
diff /tmp/migration_cols.txt /tmp/schema_cols.txt && echo MATCH
```
Expected: `MATCH` with no diff output, and both files list exactly 17 lines.

- [ ] **Step 4: Commit**

```bash
git add supabase/migration-intake-document.sql supabase/schema.sql
git commit -m "feat: add intake document columns to dogs table"
```

---

### Task 2: `IntakeFields`/`IntakeExtraction` types and intake-aware `combineAnswers`

**Files:**
- Modify: `src/types.ts`
- Create: `src/types.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Tasks 3, 4, 5, 6):
  - `IntakeFields` — the 17-field shape matching Task 1's columns.
  - `IntakeExtraction extends IntakeFields` — adds `dog_id: null`, `name: string | null`, `breed: string | null`, `age: string | null` (the raw Gemini extraction shape).
  - `emptyIntakeFields(): IntakeFields` — all fields `null`/`[]`.
  - `pickIntakeFields(source: IntakeFields): IntakeFields` — structurally picks the 17 fields off any object satisfying `IntakeFields` (works for both a `Dog` row and an `IntakeExtraction` result).
  - `Dog` now extends `IntakeFields`.
  - `combineAnswers(profile: Dog | Adopter): string` — unchanged signature; now appends an intake summary when a `Dog` has any compatibility-relevant intake data.

- [ ] **Step 1: Write failing tests**

Create `src/types.test.ts`:

```typescript
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

  it('joins the 5 answers unchanged for an adopter', () => {
    expect(combineAnswers(makeAdopter())).toBe('x1 x2 x3 x4 x5');
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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm run test -- src/types.test.ts`
Expected: FAIL — `emptyIntakeFields` is not exported / `combineAnswers` doesn't produce the intake summary yet.

- [ ] **Step 3: Add `IntakeFields`/`IntakeExtraction`, extend `Dog`, implement the helpers**

In `src/types.ts`, after the `ProfileType` export at line 1, add:

All 17 fields are declared **optional** (`?:`), not just nullable. This
is deliberate: `Dog` will extend `IntakeFields` below, and several
existing test fixtures (`DogCard.test.tsx`, `Liked.test.tsx`,
`SwipeDeck.test.tsx`, `profiles.test.ts`) construct dog-shaped object
literals that predate this feature and don't set these fields. Making
them required would break those files' compilation — out of scope for
this plan to touch. Optional keeps `Dog` backward-compatible with those
literals. Real un-set Postgres columns come back from Supabase as
`null` (never `undefined`), including `diagnosed_conditions`/
`vaccine_records` on rows that predate the Task 1 migration (`alter
table add column` backfills existing rows with `null`, not `[]`) — so
every read site below treats `null` and `undefined` as the same "no
data" case (loose `!= null` checks, `?? []` defaults), never a strict
`!== null` or an unguarded `.join()`.

```typescript
export interface IntakeFields {
  sex?: string | null;
  color?: string | null;
  intake_date?: string | null;
  intake_source?: string | null;
  weight?: string | null;
  temperature?: string | null;
  body_condition_score?: string | null;
  exam_notes?: string | null;
  vaccine_records?: string[] | null;
  deworming_flea_treatment?: string | null;
  microchip_number?: string | null;
  spay_neuter_status?: string | null;
  spay_neuter_date?: string | null;
  current_medications?: string | null;
  diagnosed_conditions?: string[] | null;
  dietary_needs_allergies?: string | null;
  behavior_observations?: string | null;
}

export interface IntakeExtraction extends IntakeFields {
  dog_id: null;
  name: string | null;
  breed: string | null;
  age: string | null;
}

export function emptyIntakeFields(): IntakeFields {
  return {
    sex: null,
    color: null,
    intake_date: null,
    intake_source: null,
    weight: null,
    temperature: null,
    body_condition_score: null,
    exam_notes: null,
    vaccine_records: [],
    deworming_flea_treatment: null,
    microchip_number: null,
    spay_neuter_status: null,
    spay_neuter_date: null,
    current_medications: null,
    diagnosed_conditions: [],
    dietary_needs_allergies: null,
    behavior_observations: null,
  };
}

export function pickIntakeFields(source: IntakeFields): IntakeFields {
  return {
    sex: source.sex,
    color: source.color,
    intake_date: source.intake_date,
    intake_source: source.intake_source,
    weight: source.weight,
    temperature: source.temperature,
    body_condition_score: source.body_condition_score,
    exam_notes: source.exam_notes,
    vaccine_records: source.vaccine_records,
    deworming_flea_treatment: source.deworming_flea_treatment,
    microchip_number: source.microchip_number,
    spay_neuter_status: source.spay_neuter_status,
    spay_neuter_date: source.spay_neuter_date,
    current_medications: source.current_medications,
    diagnosed_conditions: source.diagnosed_conditions,
    dietary_needs_allergies: source.dietary_needs_allergies,
    behavior_observations: source.behavior_observations,
  };
}
```

Change the `Dog` interface (currently `src/types.ts:16-29`) to extend `IntakeFields`:

```typescript
export interface Dog extends IntakeFields {
  id: string;
  user_id: string;
  name: string;
  breed: string;
  age: string;
  photo_urls: [string, string, string, string];
  answer_1: string;
  answer_2: string;
  answer_3: string;
  answer_4: string;
  answer_5: string;
  created_at: string;
}
```

Replace the existing `combineAnswers` function with:

```typescript
function intakeNoteFor(dog: Dog): string | null {
  const diagnosedConditions = dog.diagnosed_conditions ?? [];
  const hasIntakeData =
    dog.weight != null ||
    dog.spay_neuter_status != null ||
    diagnosedConditions.length > 0 ||
    dog.dietary_needs_allergies != null ||
    dog.behavior_observations != null;
  if (!hasIntakeData) return null;

  const parts = [`${dog.breed}, age ${dog.age}.`];
  if (dog.weight) parts.push(`Weight: ${dog.weight}.`);
  if (dog.spay_neuter_status) parts.push(`Spay/neuter status: ${dog.spay_neuter_status}.`);
  if (diagnosedConditions.length > 0) parts.push(`Diagnosed conditions: ${diagnosedConditions.join(', ')}.`);
  if (dog.dietary_needs_allergies) parts.push(`Dietary needs: ${dog.dietary_needs_allergies}.`);
  if (dog.behavior_observations) parts.push(`Vet-observed behavior: ${dog.behavior_observations}.`);
  return `Vet intake notes — ${parts.join(' ')}`;
}

export function combineAnswers(profile: Dog | Adopter): string {
  const base = [profile.answer_1, profile.answer_2, profile.answer_3, profile.answer_4, profile.answer_5].join(' ');
  if (!('breed' in profile)) return base;
  const note = intakeNoteFor(profile);
  return note ? `${base} ${note}` : base;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test -- src/types.test.ts`
Expected: PASS (all 4 tests).

Run: `npx tsc -b --noEmit`
Expected: no errors (this will surface any other file that constructs a `Dog` literal without the new fields — none exist yet outside test fixtures, which Task 6 updates).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/types.test.ts
git commit -m "feat: add IntakeFields/IntakeExtraction types and intake-aware combineAnswers"
```

---

### Task 3: Gemini vision extraction (`extractIntakeDocument`)

**Files:**
- Modify: `src/lib/gemini.ts`
- Modify: `src/lib/gemini.test.ts`

**Interfaces:**
- Consumes: `IntakeExtraction` from `../types` (Task 2).
- Produces (used by Task 6): `extractIntakeDocument(imageBase64: string, mimeType: string): Promise<IntakeExtraction>`.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/gemini.test.ts`:

```typescript
import { extractIntakeDocument } from './gemini';

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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm run test -- src/lib/gemini.test.ts`
Expected: FAIL — `extractIntakeDocument` is not exported yet.

- [ ] **Step 3: Implement `extractIntakeDocument`**

In `src/lib/gemini.ts`, add the import and function after the existing `generateCompatibilityNote` (currently ends at line 57):

```typescript
import type { IntakeExtraction } from '../types';
```

(add this at the top of the file, alongside the other top-level code)

```typescript
export async function extractIntakeDocument(imageBase64: string, mimeType: string): Promise<IntakeExtraction> {
  const prompt = [
    'You extract structured data from a photographed animal shelter intake or veterinary document.',
    'Return ONLY a JSON object matching this exact shape - no preamble, no commentary, no markdown formatting:',
    '',
    JSON.stringify(
      {
        dog_id: null,
        name: null,
        breed: null,
        age: null,
        sex: null,
        color: null,
        intake_date: null,
        intake_source: null,
        weight: null,
        temperature: null,
        body_condition_score: null,
        exam_notes: null,
        vaccine_records: [],
        deworming_flea_treatment: null,
        microchip_number: null,
        spay_neuter_status: null,
        spay_neuter_date: null,
        current_medications: null,
        diagnosed_conditions: [],
        dietary_needs_allergies: null,
        behavior_observations: null,
      },
      null,
      2
    ),
    '',
    'Rules:',
    '- Use null (or an empty array for vaccine_records / diagnosed_conditions) for any field not actually written on the document.',
    '- Never guess or infer a value that is not literally present on the page.',
    '- vaccine_records and diagnosed_conditions are arrays of short strings, one entry per item found.',
  ].join('\n');

  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini response missing text');
  }
  return JSON.parse(text) as IntakeExtraction;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test -- src/lib/gemini.test.ts`
Expected: PASS (all tests, including the existing `generateCompatibilityNote` ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gemini.ts src/lib/gemini.test.ts
git commit -m "feat: add extractIntakeDocument Gemini vision call"
```

---

### Task 4: Persist intake fields via `src/lib/api/profiles.ts`

**Files:**
- Modify: `src/lib/api/profiles.ts`
- Modify: `src/lib/api/profiles.test.ts`

**Interfaces:**
- Consumes: `IntakeFields` from `../../types` (Task 2).
- Produces (used by Task 6): `CreateDogInput.intake?: IntakeFields`, `UpdateDogInput.intake?: IntakeFields` — `createDogProfile`/`updateDogProfile` write these columns when present.

- [ ] **Step 1: Write a failing test**

Append to `src/lib/api/profiles.test.ts`:

```typescript
import { emptyIntakeFields } from '../../types';
import type { IntakeFields } from '../../types';

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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test -- src/lib/api/profiles.test.ts`
Expected: FAIL — TypeScript error, `intake` is not a known property of `CreateDogInput`.

- [ ] **Step 3: Add `intake` to the input types and persist it**

In `src/lib/api/profiles.ts`, add the import and extend the two input interfaces (currently lines 1-30):

```typescript
import type { Adopter, Dog, IntakeFields, ProfileType } from '../../types';
```

```typescript
export interface CreateDogInput {
  user_id: string;
  name: string;
  breed: string;
  age: string;
  answers: Answers;
  photos: [File, File, File, File];
  intake?: IntakeFields;
}
```

```typescript
export interface UpdateDogInput {
  id: string;
  name: string;
  breed: string;
  age: string;
  answers: Answers;
  photos: PhotoSlots;
  intake?: IntakeFields;
}
```

Add a helper next to `answersToColumns`:

```typescript
function intakeToColumns(intake?: IntakeFields) {
  return intake ?? {};
}
```

In `createDogProfile`, add `...intakeToColumns(input.intake),` to the `.insert({ ... })` object (alongside the existing `...answersToColumns(input.answers)`).

In `updateDogProfile`, add `...intakeToColumns(input.intake),` to the `.update({ ... })` object the same way.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm run test -- src/lib/api/profiles.test.ts`
Expected: PASS (all tests, including the pre-existing `createDogProfile`/`fetchOwnedProfiles` ones).

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/profiles.ts src/lib/api/profiles.test.ts
git commit -m "feat: persist reviewed intake fields on createDogProfile/updateDogProfile"
```

---

### Task 5: `IntakeReviewForm` component

**Files:**
- Create: `src/components/IntakeReviewForm.tsx`
- Create: `src/components/IntakeReviewForm.test.tsx`

**Interfaces:**
- Consumes: `IntakeFields`, `emptyIntakeFields` from `../types` (Task 2).
- Produces (used by Task 6): `IntakeReviewForm({ fields: IntakeFields, onChange: (fields: IntakeFields) => void })` — one labeled, editable input per intake field; list fields (`vaccine_records`, `diagnosed_conditions`) are edited as comma-separated text.

- [ ] **Step 1: Write failing tests**

Create `src/components/IntakeReviewForm.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyIntakeFields } from '../types';
import { IntakeReviewForm } from './IntakeReviewForm';

describe('IntakeReviewForm', () => {
  it('renders extracted scalar and list values', () => {
    const fields = { ...emptyIntakeFields(), weight: '45 lbs', diagnosed_conditions: ['hip dysplasia', 'ear infection'] };
    render(<IntakeReviewForm fields={fields} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Weight')).toHaveValue('45 lbs');
    expect(screen.getByLabelText('Diagnosed conditions (comma-separated)')).toHaveValue('hip dysplasia, ear infection');
  });

  it('reports a scalar edit via onChange without touching other fields', async () => {
    const onChange = vi.fn();
    const fields = { ...emptyIntakeFields(), weight: '45 lbs' };
    render(<IntakeReviewForm fields={fields} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText('Weight'));
    await userEvent.type(screen.getByLabelText('Weight'), '50 lbs');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ weight: '50 lbs' }));
  });

  it('reports a list edit as a parsed, trimmed array', async () => {
    const onChange = vi.fn();
    const fields = emptyIntakeFields();
    render(<IntakeReviewForm fields={fields} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Vaccine records (comma-separated)'), 'rabies, DHPP');

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ vaccine_records: ['rabies', 'DHPP'] }));
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm run test -- src/components/IntakeReviewForm.test.tsx`
Expected: FAIL — module `./IntakeReviewForm` does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/IntakeReviewForm.tsx`:

```typescript
import type { IntakeFields } from '../types';

interface IntakeFieldSpec {
  key: keyof IntakeFields;
  label: string;
  isList?: boolean;
}

const INTAKE_FIELD_SPECS: IntakeFieldSpec[] = [
  { key: 'sex', label: 'Sex' },
  { key: 'color', label: 'Color' },
  { key: 'intake_date', label: 'Intake date' },
  { key: 'intake_source', label: 'Intake source' },
  { key: 'weight', label: 'Weight' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'body_condition_score', label: 'Body condition score' },
  { key: 'exam_notes', label: 'Exam notes' },
  { key: 'vaccine_records', label: 'Vaccine records (comma-separated)', isList: true },
  { key: 'deworming_flea_treatment', label: 'Deworming / flea treatment' },
  { key: 'microchip_number', label: 'Microchip number' },
  { key: 'spay_neuter_status', label: 'Spay/neuter status' },
  { key: 'spay_neuter_date', label: 'Spay/neuter date' },
  { key: 'current_medications', label: 'Current medications' },
  { key: 'diagnosed_conditions', label: 'Diagnosed conditions (comma-separated)', isList: true },
  { key: 'dietary_needs_allergies', label: 'Dietary needs / allergies' },
  { key: 'behavior_observations', label: 'Behavior observations' },
];

interface IntakeReviewFormProps {
  fields: IntakeFields;
  onChange: (fields: IntakeFields) => void;
}

function fieldValue(fields: IntakeFields, spec: IntakeFieldSpec): string {
  if (spec.isList) return ((fields[spec.key] as string[] | null | undefined) ?? []).join(', ');
  return (fields[spec.key] as string | null | undefined) ?? '';
}

function withFieldValue(fields: IntakeFields, spec: IntakeFieldSpec, raw: string): IntakeFields {
  if (spec.isList) {
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return { ...fields, [spec.key]: list };
  }
  return { ...fields, [spec.key]: raw.trim() === '' ? null : raw };
}

export function IntakeReviewForm({ fields, onChange }: IntakeReviewFormProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-6">
      <p className="text-xs text-ink/70">Extracted from the intake document — review and correct anything before saving.</p>
      {INTAKE_FIELD_SPECS.map((spec) => (
        <div key={spec.key}>
          <label className="mb-1.5 block text-xs text-ink/70">{spec.label}</label>
          <input
            aria-label={spec.label}
            value={fieldValue(fields, spec)}
            onChange={(e) => onChange(withFieldValue(fields, spec, e.target.value))}
            className="w-full min-h-10 rounded-full border border-divider bg-surface-2 px-3.5 py-2 text-sm outline-none focus:border-clay"
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test -- src/components/IntakeReviewForm.test.tsx`
Expected: PASS (all 3 tests).

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/IntakeReviewForm.tsx src/components/IntakeReviewForm.test.tsx
git commit -m "feat: add IntakeReviewForm for editable intake-document review"
```

---

### Task 6: Wire upload → extraction → review → submit into `CreateProfile.tsx`

**Files:**
- Modify: `src/pages/CreateProfile.tsx`
- Modify: `src/pages/CreateProfile.test.tsx`

**Interfaces:**
- Consumes: `extractIntakeDocument` (Task 3), `IntakeFields`/`emptyIntakeFields`/`pickIntakeFields` (Task 2), `IntakeReviewForm` (Task 5), `intake?` on `CreateDogInput`/`UpdateDogInput` (Task 4).
- Produces: nothing consumed elsewhere — this is the top of the chain.

- [ ] **Step 1: Write failing tests**

In `src/pages/CreateProfile.test.tsx`, add a mock for `../lib/gemini` near the existing `vi.mock('../lib/api/profiles', ...)` block:

```typescript
vi.mock('../lib/gemini', () => ({
  extractIntakeDocument: vi.fn().mockResolvedValue({
    dog_id: null,
    name: 'Biscuit',
    breed: 'Lab mix',
    age: '4 years',
    sex: 'male',
    color: 'brown',
    intake_date: null,
    intake_source: null,
    weight: '50 lbs',
    temperature: null,
    body_condition_score: null,
    exam_notes: null,
    vaccine_records: [],
    deworming_flea_treatment: null,
    microchip_number: null,
    spay_neuter_status: 'neutered',
    spay_neuter_date: null,
    current_medications: null,
    diagnosed_conditions: [],
    dietary_needs_allergies: null,
    behavior_observations: 'calm around people',
  }),
}));
```

Add a new test to the `describe('CreateProfile', ...)` block:

```typescript
it('extracts an uploaded intake document, pre-fills breed/age, and includes intake data on submit', async () => {
  const { createDogProfile } = await import('../lib/api/profiles');
  render(<CreateProfile userId="s1" profileType="dog" onCreated={vi.fn()} />);

  const file = new File(['doc'], 'intake.jpg', { type: 'image/jpeg' });
  await userEvent.upload(screen.getByLabelText('intake document'), file);

  await waitFor(() => expect(screen.getByLabelText('breed')).toHaveValue('Lab mix'));
  expect(screen.getByLabelText('age')).toHaveValue('4 years');
  expect(screen.getByLabelText('Weight')).toHaveValue('50 lbs');

  await userEvent.type(screen.getByLabelText('name'), 'Biscuit');
  for (let i = 1; i <= 5; i++) {
    await userEvent.type(screen.getByLabelText(`answer ${i}`), `a${i}`);
  }
  await uploadAllPhotos();
  await userEvent.click(screen.getByText("Enter Fetch'd"));

  await waitFor(() =>
    expect(createDogProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        intake: expect.objectContaining({ weight: '50 lbs', spay_neuter_status: 'neutered', behavior_observations: 'calm around people' }),
      })
    )
  );
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test -- src/pages/CreateProfile.test.tsx`
Expected: FAIL — no element with label `intake document`.

- [ ] **Step 3: Implement the upload + review + submit wiring**

In `src/pages/CreateProfile.tsx`, update imports:

```typescript
import { extractIntakeDocument } from '../lib/gemini';
import type { IntakeFields } from '../types';
import { ADOPTER_QUESTIONS, DOG_QUESTIONS, combineAnswers, emptyIntakeFields, pickIntakeFields } from '../types';
import { IntakeReviewForm } from '../components/IntakeReviewForm';
```

Add a helper near `emptyAnswers`/`emptyPhotos`:

```typescript
function initialIntakeFields(existingProfile?: Dog | Adopter): IntakeFields {
  if (existingProfile && 'breed' in existingProfile) return pickIntakeFields(existingProfile);
  return emptyIntakeFields();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
```

Inside the `CreateProfile` component, add state alongside the existing `useState` calls:

```typescript
const [intakeFields, setIntakeFields] = useState<IntakeFields>(initialIntakeFields(existingProfile));
const [extracting, setExtracting] = useState(false);
const [extractError, setExtractError] = useState<string | null>(null);
```

Add a handler alongside `handlePhotoChange`/`handleAnswerChange`:

```typescript
async function handleIntakeDocumentChange(e: ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  setExtracting(true);
  setExtractError(null);
  try {
    const base64 = await fileToBase64(file);
    const extraction = await extractIntakeDocument(base64, file.type);
    setIntakeFields(pickIntakeFields(extraction));
    if (extraction.name) setName(extraction.name);
    if (extraction.breed) setBreed(extraction.breed);
    if (extraction.age) setAge(extraction.age);
  } catch {
    setExtractError('Could not read that document. You can still fill in fields manually below.');
  } finally {
    setExtracting(false);
  }
}
```

In `handleSubmit`, add `intake: intakeFields` to both the create and update calls for dogs:

```typescript
const dog = isEditing
  ? await updateDogProfile({ id: existingProfile!.id, name, breed, age, answers, photos: resolvedPhotos, intake: intakeFields })
  : await createDogProfile({
      user_id: userId,
      name,
      breed,
      age,
      answers,
      photos: resolvedPhotos as [File, File, File, File],
      intake: intakeFields,
    });
```

In the JSX, inside the `{isDog && ( ... )}` block that currently renders breed/age (in the left column), add the upload input directly after it:

```tsx
{isDog && (
  <div>
    <label className="mb-1.5 block text-xs text-ink/70">Intake/vet sheet (optional)</label>
    <input aria-label="intake document" type="file" accept="image/*" onChange={handleIntakeDocumentChange} className="w-full text-xs" />
    {extracting && <p className="mt-1 text-xs text-ink/60">Reading document…</p>}
    {extractError && <p className="mt-1 text-xs text-clay-700">{extractError}</p>}
  </div>
)}
```

In the right column, after the `questions.map(...)` block and before the submit `<button>`, add:

```tsx
{isDog && <IntakeReviewForm fields={intakeFields} onChange={setIntakeFields} />}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm run test -- src/pages/CreateProfile.test.tsx`
Expected: PASS (all tests, including the two pre-existing ones).

Run: `npm run test`
Expected: full suite passes.

Run: `npx tsc -b --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CreateProfile.tsx src/pages/CreateProfile.test.tsx
git commit -m "feat: wire intake document upload, extraction, and review into CreateProfile"
```

---

## Self-Review Notes

- **Spec coverage:** Capture (Task 6 upload input + Task 3 extraction) → Review (Task 5 `IntakeReviewForm`, gates writes until submit — Task 6 never calls `createDogProfile`/`updateDogProfile` from inside the extraction handler) → Use (Task 1 columns, Task 4 persistence, Task 2 `combineAnswers` feeding the unchanged `generateCompatibilityNote`). "Explicitly out of scope" items are all respected: no OCR path split, no auto-save, `answer_1`–`answer_5` untouched, no swipe/match/auth changes.
- **Type consistency:** `IntakeFields` (Task 2) is the single source of truth reused verbatim by `IntakeExtraction` (Task 2), `Dog` (Task 2), `CreateDogInput`/`UpdateDogInput.intake` (Task 4), `IntakeReviewForm` (Task 5), and `CreateProfile.tsx` state (Task 6) — no field renaming across tasks.
- **Open call the plan makes explicitly:** `age`/`breed` are not new columns (they already exist and are required); the note-generation summary only includes them when other intake data is also present, keeping "no intake document = no behavior change" true for the compatibility note as well as the schema.

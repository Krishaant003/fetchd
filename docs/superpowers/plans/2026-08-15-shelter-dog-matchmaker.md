# Shelter Dog Matchmaker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-sided (dog / adopter) swipe-matching app with live Gemini-generated compatibility notes, backed by Supabase, deployed to Vercel.

**Architecture:** A single-page React app (no router — a small view-state machine in `App.tsx`) talks directly to Supabase (Postgres + Storage) and directly to the Gemini REST API from the browser. All persistence logic lives in thin `src/lib/api/*` modules so it can be unit-tested with a mocked Supabase client; UI components stay presentational and are tested with React Testing Library.

**Tech Stack:** React + Vite + TypeScript, Tailwind CSS, `@supabase/supabase-js`, Gemini REST API (`generateContent`), Vitest + @testing-library/react, Vercel.

**Spec:** `docs/superpowers/spec.md`

## Global Constraints

- Deadline: Aug 17, 2026, 6:59 AM UTC (Google AI prize category, dev.to Weekend Challenge).
- No auth. Identity = a random UUID generated on first visit and stored in `localStorage`. State this plainly in the eventual writeup — it is an intentional scope cut.
- A single browser session may own **multiple** profiles over time (e.g. a shelter listing several dogs). `session_id` is not unique per table.
- Swipes are unique per `(swiper_id, target_id)` pair — a profile never reappears in the deck once swiped, enforced by a DB constraint, not just client filtering.
- Matches are unique per `(adopter_id, dog_id)` pair with a `status` of `pending | accepted | rejected`. A `matches` row is created the instant a mutual right-swipe is detected (status `pending`), returned to whichever party is swiping right *at that moment* (the other party's earlier right-swipe already counted as their yes). That party sees an accept/reject prompt. Accept → `accepted`, appears in the Matched section for both sides from then on. Reject → `rejected`, permanently discarded, never resurfaces for either side.
- Supabase RLS is fully open (`using (true) with check (true)`) on all four tables — consistent with the no-auth scope cut, not a real security boundary.
- Gemini compatibility notes: 1–2 sentences, specific and grounded in both parties' free text, informational tone, never a match/no-match verdict, never generic flattery. Generated live per currently-visible card, not cached in `dogs`/`adopters`.
- Gemini API key is called directly from the browser (exposed in client code). This is accepted for the weekend deadline — do not build a proxy unless explicitly asked later.
- Visual direction: commit to the spec's suggested "physical/paper" metaphor — dogs as kraft-paper intake cards, adopters as lined index-card applications, the compatibility note as a separate taped/pinned annotation rotated relative to the card, not another paragraph in the card body. This is a first pass, expected to be revisited later.

---

## File Structure

```
supabase/schema.sql                  # DDL: tables, constraints, RLS policies
src/types.ts                         # Shared TS types
src/supabaseClient.ts                # Supabase client instance
src/lib/session.ts                   # session id + active profile (localStorage)
src/lib/gemini.ts                    # Gemini compatibility-note wrapper
src/lib/api/profiles.ts              # createDogProfile, createAdopterProfile, fetchProfileText
src/lib/api/swipes.ts                # fetchDeck, recordSwipe
src/lib/api/matches.ts               # respondToMatch, fetchAcceptedMatches
src/components/DogCard.tsx           # Dog card (intake-card styling) + note annotation
src/components/AdopterCard.tsx       # Adopter card (index-card styling) + note annotation
src/pages/Landing.tsx                # Mode picker / continue
src/pages/CreateProfile.tsx          # Profile creation form (dog/adopter variants)
src/pages/SwipeDeck.tsx              # Deck rendering + swipe handling + note fetching
src/pages/MatchPrompt.tsx            # Accept/reject overlay
src/pages/MatchedSection.tsx         # List of accepted matches
src/App.tsx                          # View-state machine wiring everything together
```

Each `src/lib/**` file is pure logic and gets a co-located `*.test.ts`. Each `src/pages`/`src/components` file gets a co-located `*.test.tsx` with one meaningful behavioral test.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `src/main.tsx`, `src/index.css`, `.env.example`, `index.html`

**Interfaces:**
- Produces: a runnable Vite dev server, Tailwind pipeline, and Vitest test runner that later tasks build on.

- [ ] **Step 1: Scaffold with Vite**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Install runtime deps**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 3: Install and configure Tailwind**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import `./index.css` in `src/main.tsx`.

- [ ] **Step 4: Install and configure Vitest + RTL**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});
```

`src/setupTests.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 5: Env template**

`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

- [ ] **Step 6: Verify scaffold**

Run: `npm run dev` (starts, no errors), then `Ctrl+C`, then `npm run test` (passes with zero test files, exit code 0).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts tailwind.config.js postcss.config.js tsconfig.json tsconfig.node.json src/main.tsx src/index.css src/setupTests.ts .env.example index.html
git commit -m "chore: scaffold Vite/React/Tailwind/Vitest project"
```

---

### Task 2: Supabase schema

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: `adopters`, `dogs`, `swipes`, `matches` tables that every later `src/lib/api/*` module reads/writes.

- [ ] **Step 1: Write the schema**

```sql
create extension if not exists "pgcrypto";

create table adopters (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  photo_url text not null,
  lifestyle_text text not null,
  created_at timestamptz not null default now()
);

create table dogs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  breed text not null,
  age text not null,
  story text not null,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create table swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid not null,
  swiper_type text not null check (swiper_type in ('adopter', 'dog')),
  target_id uuid not null,
  target_type text not null check (target_type in ('adopter', 'dog')),
  direction text not null check (direction in ('right', 'left')),
  created_at timestamptz not null default now(),
  unique (swiper_id, target_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  adopter_id uuid not null references adopters(id),
  dog_id uuid not null references dogs(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (adopter_id, dog_id)
);

alter table adopters enable row level security;
alter table dogs enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;

create policy "public read/write adopters" on adopters for all using (true) with check (true);
create policy "public read/write dogs" on dogs for all using (true) with check (true);
create policy "public read/write swipes" on swipes for all using (true) with check (true);
create policy "public read/write matches" on matches for all using (true) with check (true);
```

- [ ] **Step 2: Apply and verify**

Run this SQL in the Supabase project's SQL editor. Verify with:

```sql
select table_name from information_schema.tables where table_schema = 'public';
```

Expected: `adopters`, `dogs`, `swipes`, `matches` all present. Also confirm the `photos` Storage bucket (already created per spec) is set to public.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase schema for adopters, dogs, swipes, matches"
```

---

### Task 3: Types + session module

**Files:**
- Create: `src/types.ts`
- Create: `src/supabaseClient.ts`
- Create: `src/lib/session.ts`
- Test: `src/lib/session.test.ts`

**Interfaces:**
- Produces: `ProfileType`, `Adopter`, `Dog`, `Swipe`, `Match`, `MatchStatus` types; `supabase` client instance; `ActiveProfile`, `getOrCreateSessionId()`, `getActiveProfile()`, `setActiveProfile(profile)`.

- [ ] **Step 1: Types**

`src/types.ts`:
```ts
export type ProfileType = 'adopter' | 'dog';

export interface Adopter {
  id: string;
  session_id: string;
  name: string;
  photo_url: string;
  lifestyle_text: string;
  created_at: string;
}

export interface Dog {
  id: string;
  session_id: string;
  name: string;
  breed: string;
  age: string;
  story: string;
  photo_url: string;
  created_at: string;
}

export interface Swipe {
  id: string;
  swiper_id: string;
  swiper_type: ProfileType;
  target_id: string;
  target_type: ProfileType;
  direction: 'right' | 'left';
  created_at: string;
}

export type MatchStatus = 'pending' | 'accepted' | 'rejected';

export interface Match {
  id: string;
  adopter_id: string;
  dog_id: string;
  status: MatchStatus;
  created_at: string;
}
```

`src/supabaseClient.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Write the failing test**

`src/lib/session.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getOrCreateSessionId, getActiveProfile, setActiveProfile } from './session';

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and persists a session id on first call', () => {
    const id = getOrCreateSessionId();
    expect(id).toBeTruthy();
    expect(getOrCreateSessionId()).toBe(id);
  });

  it('returns null when no active profile is stored', () => {
    expect(getActiveProfile()).toBeNull();
  });

  it('stores and retrieves the active profile', () => {
    setActiveProfile({ type: 'dog', id: 'abc-123' });
    expect(getActiveProfile()).toEqual({ type: 'dog', id: 'abc-123' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- session.test.ts`
Expected: FAIL — `session.ts` does not exist yet.

- [ ] **Step 4: Implement**

`src/lib/session.ts`:
```ts
import { ProfileType } from '../types';

const SESSION_ID_KEY = 'dogmatch_session_id';
const ACTIVE_PROFILE_KEY = 'dogmatch_active_profile';

export interface ActiveProfile {
  type: ProfileType;
  id: string;
}

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function getActiveProfile(): ActiveProfile | null {
  const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ActiveProfile;
}

export function setActiveProfile(profile: ActiveProfile): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- session.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/supabaseClient.ts src/lib/session.ts src/lib/session.test.ts
git commit -m "feat: add shared types, supabase client, and session/local-identity module"
```

---

### Task 4: Gemini compatibility-note wrapper

**Files:**
- Create: `src/lib/gemini.ts`
- Test: `src/lib/gemini.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `generateCompatibilityNote(viewerText: string, targetText: string): Promise<string>` — used by `SwipeDeck` (Task 10).

- [ ] **Step 1: Write the failing test**

`src/lib/gemini.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- gemini.test.ts`
Expected: FAIL — `gemini.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/lib/gemini.ts`:
```ts
const GEMINI_MODEL = 'gemini-2.5-flash';

function endpoint(): string {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

export async function generateCompatibilityNote(viewerText: string, targetText: string): Promise<string> {
  const prompt = [
    'You write short compatibility notes for a shelter-dog adoption app.',
    'The viewer wrote this about themselves or their dog:',
    viewerText,
    'The profile they are looking at says:',
    targetText,
    'Write 1-2 sentences that are specific and grounded in the text above.',
    'Never give a match/no-match verdict, never use generic flattery.',
    'Point out one concrete, checkable observation - flattering or a genuine heads-up.',
  ].join('\n');

  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini response missing text');
  }
  return text.trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- gemini.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/gemini.ts src/lib/gemini.test.ts
git commit -m "feat: add Gemini compatibility-note wrapper"
```

---

### Task 5: Profile creation API

**Files:**
- Create: `src/lib/api/profiles.ts`
- Test: `src/lib/api/profiles.test.ts`

**Interfaces:**
- Consumes: `supabase` from `src/supabaseClient.ts` (Task 3), `Dog`/`Adopter`/`ProfileType` from `src/types.ts` (Task 3).
- Produces: `createDogProfile(input): Promise<Dog>`, `createAdopterProfile(input): Promise<Adopter>`, `fetchProfileText(type, id): Promise<string>` — used by `CreateProfile` (Task 9) and `App` (Task 13).

- [ ] **Step 1: Write the failing test**

`src/lib/api/profiles.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- profiles.test.ts`
Expected: FAIL — `profiles.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/lib/api/profiles.ts`:
```ts
import { supabase } from '../../supabaseClient';
import { Adopter, Dog, ProfileType } from '../../types';

export interface CreateDogInput {
  session_id: string;
  name: string;
  breed: string;
  age: string;
  story: string;
  photo: File;
}

export interface CreateAdopterInput {
  session_id: string;
  name: string;
  lifestyle_text: string;
  photo: File;
}

async function uploadPhoto(photo: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${photo.name}`;
  const { error } = await supabase.storage.from('photos').upload(path, photo);
  if (error) throw error;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function createDogProfile(input: CreateDogInput): Promise<Dog> {
  const photo_url = await uploadPhoto(input.photo);
  const { data, error } = await supabase
    .from('dogs')
    .insert({
      session_id: input.session_id,
      name: input.name,
      breed: input.breed,
      age: input.age,
      story: input.story,
      photo_url,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Dog;
}

export async function createAdopterProfile(input: CreateAdopterInput): Promise<Adopter> {
  const photo_url = await uploadPhoto(input.photo);
  const { data, error } = await supabase
    .from('adopters')
    .insert({
      session_id: input.session_id,
      name: input.name,
      lifestyle_text: input.lifestyle_text,
      photo_url,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Adopter;
}

export async function fetchProfileText(type: ProfileType, id: string): Promise<string> {
  if (type === 'dog') {
    const { data, error } = await supabase.from('dogs').select('story').eq('id', id).single();
    if (error) throw error;
    return data.story;
  }
  const { data, error } = await supabase.from('adopters').select('lifestyle_text').eq('id', id).single();
  if (error) throw error;
  return data.lifestyle_text;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- profiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/profiles.ts src/lib/api/profiles.test.ts
git commit -m "feat: add profile creation and profile-text API"
```

---

### Task 6: Deck + swipe API

**Files:**
- Create: `src/lib/api/swipes.ts`
- Test: `src/lib/api/swipes.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 3), `Dog`/`Adopter`/`ProfileType` (Task 3).
- Produces: `fetchDeck(viewerType, viewerId): Promise<(Dog|Adopter)[]>`, `recordSwipe(swiperType, swiperId, targetType, targetId, direction): Promise<{ matchId: string | null }>` — used by `SwipeDeck` (Task 10).

- [ ] **Step 1: Write the failing test**

`src/lib/api/swipes.test.ts`:
```ts
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
    const eq4 = vi.fn().mockReturnValue({ maybeSingle });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- swipes.test.ts`
Expected: FAIL — `swipes.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/lib/api/swipes.ts`:
```ts
import { supabase } from '../../supabaseClient';
import { Adopter, Dog, ProfileType } from '../../types';

export async function fetchDeck(viewerType: ProfileType, viewerId: string): Promise<(Dog | Adopter)[]> {
  const targetType: ProfileType = viewerType === 'dog' ? 'adopter' : 'dog';
  const targetTable = targetType === 'dog' ? 'dogs' : 'adopters';

  const { data: swiped, error: swipedError } = await supabase
    .from('swipes')
    .select('target_id')
    .eq('swiper_id', viewerId)
    .eq('swiper_type', viewerType);
  if (swipedError) throw swipedError;
  const swipedIds = (swiped ?? []).map((s: { target_id: string }) => s.target_id);

  let query = supabase.from(targetTable).select('*');
  if (swipedIds.length > 0) {
    query = query.not('id', 'in', `(${swipedIds.join(',')})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as (Dog | Adopter)[];
}

export interface RecordSwipeResult {
  matchId: string | null;
}

export async function recordSwipe(
  swiperType: ProfileType,
  swiperId: string,
  targetType: ProfileType,
  targetId: string,
  direction: 'right' | 'left'
): Promise<RecordSwipeResult> {
  const { error: swipeError } = await supabase.from('swipes').insert({
    swiper_id: swiperId,
    swiper_type: swiperType,
    target_id: targetId,
    target_type: targetType,
    direction,
  });
  if (swipeError) throw swipeError;

  if (direction === 'left') return { matchId: null };

  const { data: reciprocal, error: reciprocalError } = await supabase
    .from('swipes')
    .select('id')
    .eq('swiper_id', targetId)
    .eq('swiper_type', targetType)
    .eq('target_id', swiperId)
    .eq('target_type', swiperType)
    .eq('direction', 'right')
    .maybeSingle();
  if (reciprocalError) throw reciprocalError;
  if (!reciprocal) return { matchId: null };

  const adopterId = swiperType === 'adopter' ? swiperId : targetId;
  const dogId = swiperType === 'dog' ? swiperId : targetId;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({ adopter_id: adopterId, dog_id: dogId, status: 'pending' })
    .select()
    .single();
  if (matchError) throw matchError;
  return { matchId: match.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- swipes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/swipes.ts src/lib/api/swipes.test.ts
git commit -m "feat: add deck fetching and swipe recording with mutual-match detection"
```

---

### Task 7: Matches API

**Files:**
- Create: `src/lib/api/matches.ts`
- Test: `src/lib/api/matches.test.ts`

**Interfaces:**
- Consumes: `supabase` (Task 3), `Match`/`Dog`/`Adopter`/`ProfileType` (Task 3).
- Produces: `respondToMatch(matchId, decision): Promise<void>`, `fetchAcceptedMatches(viewerType, viewerId): Promise<AcceptedMatch[]>` — used by `MatchPrompt` (Task 11) and `MatchedSection` (Task 12).

- [ ] **Step 1: Write the failing test**

`src/lib/api/matches.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabaseClient', () => ({ supabase: { from: vi.fn() } }));

import { supabase } from '../../supabaseClient';
import { respondToMatch, fetchAcceptedMatches } from './matches';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- matches.test.ts`
Expected: FAIL — `matches.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/lib/api/matches.ts`:
```ts
import { supabase } from '../../supabaseClient';
import { Adopter, Dog, Match, MatchStatus, ProfileType } from '../../types';

export type MatchDecision = Extract<MatchStatus, 'accepted' | 'rejected'>;

export async function respondToMatch(matchId: string, decision: MatchDecision): Promise<void> {
  const { error } = await supabase.from('matches').update({ status: decision }).eq('id', matchId);
  if (error) throw error;
}

export interface AcceptedMatch {
  match: Match;
  dog: Dog;
  adopter: Adopter;
}

export async function fetchAcceptedMatches(viewerType: ProfileType, viewerId: string): Promise<AcceptedMatch[]> {
  const column = viewerType === 'adopter' ? 'adopter_id' : 'dog_id';
  const { data, error } = await supabase
    .from('matches')
    .select('*, dog:dogs(*), adopter:adopters(*)')
    .eq(column, viewerId)
    .eq('status', 'accepted');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    match: {
      id: row.id,
      adopter_id: row.adopter_id,
      dog_id: row.dog_id,
      status: row.status,
      created_at: row.created_at,
    },
    dog: row.dog,
    adopter: row.adopter,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- matches.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/matches.ts src/lib/api/matches.test.ts
git commit -m "feat: add match accept/reject and accepted-matches lookup API"
```

---

### Task 8: Dog and adopter card components

**Files:**
- Create: `src/components/DogCard.tsx`
- Create: `src/components/AdopterCard.tsx`
- Test: `src/components/DogCard.test.tsx`
- Test: `src/components/AdopterCard.test.tsx`

**Interfaces:**
- Consumes: `Dog`/`Adopter` (Task 3).
- Produces: `<DogCard dog note noteLoading />`, `<AdopterCard adopter note noteLoading />` — used by `SwipeDeck` (Task 10).

- [ ] **Step 1: Write the failing test**

`src/components/DogCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DogCard } from './DogCard';

const dog = {
  id: 'd1',
  session_id: 's1',
  name: 'Rex',
  breed: 'Mutt',
  age: '2',
  story: 'Loves parks',
  photo_url: 'https://example.com/rex.jpg',
  created_at: '2026-08-15T00:00:00Z',
};

describe('DogCard', () => {
  it('shows the dog details and a loading state for the note', () => {
    render(<DogCard dog={dog} noteLoading={true} />);
    expect(screen.getByText('Rex')).toBeInTheDocument();
    expect(screen.getByText(/Mutt/)).toBeInTheDocument();
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });

  it('shows the resolved note once loaded', () => {
    render(<DogCard dog={dog} note="Both of you love the outdoors." noteLoading={false} />);
    expect(screen.getByText('Both of you love the outdoors.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- DogCard.test.tsx`
Expected: FAIL — `DogCard.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/components/DogCard.tsx`:
```tsx
import { Dog } from '../types';

interface DogCardProps {
  dog: Dog;
  note?: string;
  noteLoading: boolean;
}

export function DogCard({ dog, note, noteLoading }: DogCardProps) {
  return (
    <div className="relative rotate-[-1deg] rounded-sm border-2 border-amber-900 bg-amber-50 p-4 shadow-lg font-mono">
      <div className="absolute -top-3 left-4 rounded bg-amber-900 px-2 py-0.5 text-xs uppercase tracking-widest text-amber-50">
        Intake Card
      </div>
      <img
        src={dog.photo_url}
        alt={dog.name}
        className="mb-3 h-56 w-full rounded-sm border border-amber-900 object-cover"
      />
      <h2 className="text-xl font-bold uppercase text-amber-950">{dog.name}</h2>
      <p className="text-sm text-amber-900">{dog.breed} — {dog.age}</p>
      <p className="mt-2 text-sm text-amber-950">{dog.story}</p>
      {(note || noteLoading) && (
        <div className="absolute -right-4 -top-4 w-48 rotate-[4deg] border border-dashed border-yellow-700 bg-yellow-100 p-2 text-xs text-yellow-900 shadow-md">
          <p className="mb-1 font-bold uppercase">Note</p>
          {noteLoading ? <p>thinking…</p> : <p>{note}</p>}
        </div>
      )}
    </div>
  );
}
```

`src/components/AdopterCard.tsx`:
```tsx
import { Adopter } from '../types';

interface AdopterCardProps {
  adopter: Adopter;
  note?: string;
  noteLoading: boolean;
}

export function AdopterCard({ adopter, note, noteLoading }: AdopterCardProps) {
  return (
    <div className="relative rotate-[1deg] rounded-sm border-2 border-slate-700 bg-[repeating-linear-gradient(white,white_27px,#cbd5e1_28px)] p-4 shadow-lg font-mono">
      <div className="absolute -top-3 left-4 rounded bg-slate-700 px-2 py-0.5 text-xs uppercase tracking-widest text-white">
        Applicant
      </div>
      <img
        src={adopter.photo_url}
        alt={adopter.name}
        className="mb-3 h-56 w-full rounded-sm border border-slate-700 object-cover"
      />
      <h2 className="text-xl font-bold uppercase text-slate-900">{adopter.name}</h2>
      <p className="mt-2 text-sm text-slate-900">{adopter.lifestyle_text}</p>
      {(note || noteLoading) && (
        <div className="absolute -right-4 -top-4 w-48 rotate-[-4deg] border border-dashed border-yellow-700 bg-yellow-100 p-2 text-xs text-yellow-900 shadow-md">
          <p className="mb-1 font-bold uppercase">Note</p>
          {noteLoading ? <p>thinking…</p> : <p>{note}</p>}
        </div>
      )}
    </div>
  );
}
```

`src/components/AdopterCard.test.tsx` (mirror of DogCard's test, adapted to adopter fields):
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdopterCard } from './AdopterCard';

const adopter = {
  id: 'a1',
  session_id: 's1',
  name: 'Jo',
  photo_url: 'https://example.com/jo.jpg',
  lifestyle_text: 'Runs every morning near the park.',
  created_at: '2026-08-15T00:00:00Z',
};

describe('AdopterCard', () => {
  it('shows the adopter details and a loading state for the note', () => {
    render(<AdopterCard adopter={adopter} noteLoading={true} />);
    expect(screen.getByText('Jo')).toBeInTheDocument();
    expect(screen.getByText(/Runs every morning/)).toBeInTheDocument();
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
  });

  it('shows the resolved note once loaded', () => {
    render(<AdopterCard adopter={adopter} note="You both like early mornings outside." noteLoading={false} />);
    expect(screen.getByText('You both like early mornings outside.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- DogCard.test.tsx AdopterCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DogCard.tsx src/components/AdopterCard.tsx src/components/DogCard.test.tsx src/components/AdopterCard.test.tsx
git commit -m "feat: add dog/adopter card components with attached-note styling"
```

---

### Task 9: Landing page

**Files:**
- Create: `src/pages/Landing.tsx`
- Test: `src/pages/Landing.test.tsx`

**Interfaces:**
- Consumes: `ActiveProfile` (Task 3), `ProfileType` (Task 3).
- Produces: `<Landing activeProfile onPickMode onContinue />` — used by `App` (Task 13).

- [ ] **Step 1: Write the failing test**

`src/pages/Landing.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';

describe('Landing', () => {
  it('calls onPickMode with the chosen type', async () => {
    const onPickMode = vi.fn();
    render(<Landing activeProfile={null} onPickMode={onPickMode} onContinue={vi.fn()} />);
    await userEvent.click(screen.getByText("I'm a Dog"));
    expect(onPickMode).toHaveBeenCalledWith('dog');
  });

  it('shows a Continue button only when there is an active profile', () => {
    const { rerender } = render(<Landing activeProfile={null} onPickMode={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.queryByText('Continue')).not.toBeInTheDocument();

    rerender(<Landing activeProfile={{ type: 'dog', id: 'd1' }} onPickMode={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Landing.test.tsx`
Expected: FAIL — `Landing.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/pages/Landing.tsx`:
```tsx
import { ProfileType } from '../types';
import { ActiveProfile } from '../lib/session';

interface LandingProps {
  activeProfile: ActiveProfile | null;
  onPickMode: (type: ProfileType) => void;
  onContinue: () => void;
}

export function Landing({ activeProfile, onPickMode, onContinue }: LandingProps) {
  return (
    <div className="mx-auto max-w-sm space-y-4 p-8 text-center font-mono">
      <h1 className="text-2xl font-bold uppercase text-amber-950">Shelter Dog Matchmaker</h1>
      {activeProfile && (
        <button onClick={onContinue} className="w-full border-2 border-amber-900 bg-amber-900 py-2 text-amber-50">
          Continue
        </button>
      )}
      <button onClick={() => onPickMode('dog')} className="w-full border-2 border-amber-900 py-2 text-amber-900">
        I'm a Dog
      </button>
      <button onClick={() => onPickMode('adopter')} className="w-full border-2 border-amber-900 py-2 text-amber-900">
        I'm an Adopter
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- Landing.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Landing.tsx src/pages/Landing.test.tsx
git commit -m "feat: add landing page with mode picker and continue"
```

---

### Task 10: Create-profile form

**Files:**
- Create: `src/pages/CreateProfile.tsx`
- Test: `src/pages/CreateProfile.test.tsx`

**Interfaces:**
- Consumes: `createDogProfile`, `createAdopterProfile` (Task 5), `ProfileType` (Task 3), `ActiveProfile` (Task 3).
- Produces: `<CreateProfile sessionId profileType onCreated />` where `onCreated(profile: ActiveProfile, viewerText: string)` — used by `App` (Task 13).

- [ ] **Step 1: Write the failing test**

`src/pages/CreateProfile.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/profiles', () => ({
  createDogProfile: vi.fn().mockResolvedValue({ id: 'd1', story: 'Loves parks' }),
  createAdopterProfile: vi.fn(),
}));

import { CreateProfile } from './CreateProfile';

describe('CreateProfile', () => {
  it('submits a dog profile and calls onCreated', async () => {
    const onCreated = vi.fn();
    render(<CreateProfile sessionId="s1" profileType="dog" onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('name'), 'Rex');
    await userEvent.type(screen.getByLabelText('breed'), 'Mutt');
    await userEvent.type(screen.getByLabelText('age'), '2');
    await userEvent.type(screen.getByLabelText('story'), 'Loves parks');
    const file = new File(['data'], 'rex.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('photo'), file);
    await userEvent.click(screen.getByText('Submit'));

    expect(onCreated).toHaveBeenCalledWith({ type: 'dog', id: 'd1' }, 'Loves parks');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- CreateProfile.test.tsx`
Expected: FAIL — `CreateProfile.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/pages/CreateProfile.tsx`:
```tsx
import { FormEvent, useState } from 'react';
import { ProfileType } from '../types';
import { createDogProfile, createAdopterProfile } from '../lib/api/profiles';
import { ActiveProfile } from '../lib/session';

interface CreateProfileProps {
  sessionId: string;
  profileType: ProfileType;
  onCreated: (profile: ActiveProfile, viewerText: string) => void;
}

export function CreateProfile({ sessionId, profileType, onCreated }: CreateProfileProps) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [story, setStory] = useState('');
  const [lifestyleText, setLifestyleText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!photo) return;
    setSubmitting(true);
    if (profileType === 'dog') {
      const dog = await createDogProfile({ session_id: sessionId, name, breed, age, story, photo });
      onCreated({ type: 'dog', id: dog.id }, dog.story);
    } else {
      const adopter = await createAdopterProfile({ session_id: sessionId, name, lifestyle_text: lifestyleText, photo });
      onCreated({ type: 'adopter', id: adopter.id }, adopter.lifestyle_text);
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-3 border-2 border-amber-900 bg-amber-50 p-6 font-mono">
      <h2 className="text-lg font-bold uppercase">
        {profileType === 'dog' ? 'Dog Intake Form' : 'Adopter Application'}
      </h2>
      <input aria-label="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full border p-2" />
      {profileType === 'dog' ? (
        <>
          <input aria-label="breed" required value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" className="w-full border p-2" />
          <input aria-label="age" required value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="w-full border p-2" />
          <textarea aria-label="story" required value={story} onChange={(e) => setStory(e.target.value)} placeholder="Story" className="w-full border p-2" />
        </>
      ) : (
        <textarea aria-label="lifestyle" required value={lifestyleText} onChange={(e) => setLifestyleText(e.target.value)} placeholder="Tell us about your lifestyle" className="w-full border p-2" />
      )}
      <input aria-label="photo" required type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="w-full" />
      <button type="submit" disabled={submitting} className="w-full border-2 border-amber-900 bg-amber-900 py-2 text-amber-50">
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- CreateProfile.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/CreateProfile.tsx src/pages/CreateProfile.test.tsx
git commit -m "feat: add profile creation form for dogs and adopters"
```

---

### Task 11: Swipe deck page

**Files:**
- Create: `src/pages/SwipeDeck.tsx`
- Test: `src/pages/SwipeDeck.test.tsx`

**Interfaces:**
- Consumes: `fetchDeck`, `recordSwipe` (Task 6), `generateCompatibilityNote` (Task 4), `DogCard`, `AdopterCard` (Task 8), `ActiveProfile` (Task 3).
- Produces: `<SwipeDeck activeProfile viewerText onMatch />` where `onMatch(matchId: string)` — used by `App` (Task 13).

- [ ] **Step 1: Write the failing test**

`src/pages/SwipeDeck.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const dog = {
  id: 'd1',
  session_id: 's1',
  name: 'Rex',
  breed: 'Mutt',
  age: '2',
  story: 'Loves parks',
  photo_url: 'https://example.com/rex.jpg',
  created_at: '2026-08-15T00:00:00Z',
};

vi.mock('../lib/api/swipes', () => ({
  fetchDeck: vi.fn().mockResolvedValue([dog]),
  recordSwipe: vi.fn().mockResolvedValue({ matchId: 'match-1' }),
}));
vi.mock('../lib/gemini', () => ({
  generateCompatibilityNote: vi.fn().mockResolvedValue('You both love the outdoors.'),
}));

import { SwipeDeck } from './SwipeDeck';
import { recordSwipe } from '../lib/api/swipes';

describe('SwipeDeck', () => {
  it('loads the deck, shows the note, and reports a match on right-swipe', async () => {
    const onMatch = vi.fn();
    render(
      <SwipeDeck
        activeProfile={{ type: 'adopter', id: 'a1' }}
        viewerText="I love hiking"
        onMatch={onMatch}
      />
    );

    expect(await screen.findByText('Rex')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('You both love the outdoors.')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Interested'));

    expect(recordSwipe).toHaveBeenCalledWith('adopter', 'a1', 'dog', 'd1', 'right');
    await waitFor(() => expect(onMatch).toHaveBeenCalledWith('match-1'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- SwipeDeck.test.tsx`
Expected: FAIL — `SwipeDeck.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/pages/SwipeDeck.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { ActiveProfile } from '../lib/session';
import { fetchDeck, recordSwipe } from '../lib/api/swipes';
import { generateCompatibilityNote } from '../lib/gemini';
import { Dog, Adopter } from '../types';
import { DogCard } from '../components/DogCard';
import { AdopterCard } from '../components/AdopterCard';

interface SwipeDeckProps {
  activeProfile: ActiveProfile;
  viewerText: string;
  onMatch: (matchId: string) => void;
}

export function SwipeDeck({ activeProfile, viewerText, onMatch }: SwipeDeckProps) {
  const [deck, setDeck] = useState<(Dog | Adopter)[]>([]);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState<string | undefined>();
  const [noteLoading, setNoteLoading] = useState(false);

  const targetType = activeProfile.type === 'dog' ? 'adopter' : 'dog';
  const current = deck[index];

  useEffect(() => {
    fetchDeck(activeProfile.type, activeProfile.id).then(setDeck);
  }, [activeProfile]);

  useEffect(() => {
    if (!current) return;
    setNote(undefined);
    setNoteLoading(true);
    const targetText = targetType === 'dog' ? (current as Dog).story : (current as Adopter).lifestyle_text;
    generateCompatibilityNote(viewerText, targetText)
      .then(setNote)
      .catch(() => setNote('No note available right now.'))
      .finally(() => setNoteLoading(false));
  }, [current, targetType, viewerText]);

  async function handleSwipe(direction: 'right' | 'left') {
    if (!current) return;
    const result = await recordSwipe(activeProfile.type, activeProfile.id, targetType, current.id, direction);
    if (result.matchId) onMatch(result.matchId);
    setIndex((i) => i + 1);
  }

  if (!current) return <p className="p-8 text-center font-mono">No more profiles right now.</p>;

  return (
    <div className="mx-auto max-w-sm p-4">
      {targetType === 'dog' ? (
        <DogCard dog={current as Dog} note={note} noteLoading={noteLoading} />
      ) : (
        <AdopterCard adopter={current as Adopter} note={note} noteLoading={noteLoading} />
      )}
      <div className="mt-4 flex justify-center gap-4">
        <button onClick={() => handleSwipe('left')} className="rounded-full border-2 border-red-700 px-6 py-2 font-mono text-red-700">
          Pass
        </button>
        <button onClick={() => handleSwipe('right')} className="rounded-full border-2 border-green-700 px-6 py-2 font-mono text-green-700">
          Interested
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- SwipeDeck.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/SwipeDeck.tsx src/pages/SwipeDeck.test.tsx
git commit -m "feat: add swipe deck with live compatibility notes and swipe handling"
```

---

### Task 12: Match accept/reject prompt

**Files:**
- Create: `src/pages/MatchPrompt.tsx`
- Test: `src/pages/MatchPrompt.test.tsx`

**Interfaces:**
- Consumes: `respondToMatch` (Task 7).
- Produces: `<MatchPrompt matchId onResolved />` — used by `App` (Task 13).

- [ ] **Step 1: Write the failing test**

`src/pages/MatchPrompt.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/matches', () => ({
  respondToMatch: vi.fn().mockResolvedValue(undefined),
}));

import { MatchPrompt } from './MatchPrompt';
import { respondToMatch } from '../lib/api/matches';

describe('MatchPrompt', () => {
  it('accepts the match and calls onResolved', async () => {
    const onResolved = vi.fn();
    render(<MatchPrompt matchId="match-1" onResolved={onResolved} />);

    await userEvent.click(screen.getByText('Accept'));

    expect(respondToMatch).toHaveBeenCalledWith('match-1', 'accepted');
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });

  it('rejects the match and calls onResolved', async () => {
    const onResolved = vi.fn();
    render(<MatchPrompt matchId="match-1" onResolved={onResolved} />);

    await userEvent.click(screen.getByText('Not now'));

    expect(respondToMatch).toHaveBeenCalledWith('match-1', 'rejected');
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- MatchPrompt.test.tsx`
Expected: FAIL — `MatchPrompt.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/pages/MatchPrompt.tsx`:
```tsx
import { respondToMatch, MatchDecision } from '../lib/api/matches';

interface MatchPromptProps {
  matchId: string;
  onResolved: () => void;
}

export function MatchPrompt({ matchId, onResolved }: MatchPromptProps) {
  async function respond(decision: MatchDecision) {
    await respondToMatch(matchId, decision);
    onResolved();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <div className="w-72 rotate-[-2deg] border-4 border-double border-amber-900 bg-amber-50 p-6 text-center font-mono shadow-2xl">
        <p className="mb-4 text-lg font-bold uppercase text-amber-950">It's a match!</p>
        <p className="mb-4 text-sm text-amber-900">Someone already said yes to you. Accept to lock it in.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => respond('rejected')} className="rounded border-2 border-red-700 px-4 py-2 text-red-700">
            Not now
          </button>
          <button onClick={() => respond('accepted')} className="rounded border-2 border-green-700 px-4 py-2 text-green-700">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- MatchPrompt.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/MatchPrompt.tsx src/pages/MatchPrompt.test.tsx
git commit -m "feat: add match accept/reject prompt"
```

---

### Task 13: Matched section page

**Files:**
- Create: `src/pages/MatchedSection.tsx`
- Test: `src/pages/MatchedSection.test.tsx`

**Interfaces:**
- Consumes: `fetchAcceptedMatches` (Task 7), `ActiveProfile` (Task 3).
- Produces: `<MatchedSection activeProfile />` — used by `App` (Task 14).

- [ ] **Step 1: Write the failing test**

`src/pages/MatchedSection.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/api/matches', () => ({
  fetchAcceptedMatches: vi.fn().mockResolvedValue([
    {
      match: { id: 'm1', adopter_id: 'a1', dog_id: 'd1', status: 'accepted', created_at: '2026-08-15T00:00:00Z' },
      dog: { id: 'd1', name: 'Rex', photo_url: 'https://example.com/rex.jpg' },
      adopter: { id: 'a1', name: 'Jo', photo_url: 'https://example.com/jo.jpg' },
    },
  ]),
}));

import { MatchedSection } from './MatchedSection';

describe('MatchedSection', () => {
  it('shows the matched dog name for an adopter viewer', async () => {
    render(<MatchedSection activeProfile={{ type: 'adopter', id: 'a1' }} />);
    expect(await screen.findByText('Rex')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- MatchedSection.test.tsx`
Expected: FAIL — `MatchedSection.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/pages/MatchedSection.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { ActiveProfile } from '../lib/session';
import { fetchAcceptedMatches, AcceptedMatch } from '../lib/api/matches';

interface MatchedSectionProps {
  activeProfile: ActiveProfile;
}

export function MatchedSection({ activeProfile }: MatchedSectionProps) {
  const [matches, setMatches] = useState<AcceptedMatch[]>([]);

  useEffect(() => {
    fetchAcceptedMatches(activeProfile.type, activeProfile.id).then(setMatches);
  }, [activeProfile]);

  if (matches.length === 0) {
    return <p className="p-8 text-center font-mono">No matches yet.</p>;
  }

  return (
    <ul className="mx-auto max-w-sm space-y-3 p-4">
      {matches.map(({ match, dog, adopter }) => {
        const other = activeProfile.type === 'dog' ? adopter : dog;
        return (
          <li key={match.id} className="flex items-center gap-3 border-2 border-amber-900 bg-amber-50 p-3 font-mono">
            <img src={other.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            <span>{other.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- MatchedSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/MatchedSection.tsx src/pages/MatchedSection.test.tsx
git commit -m "feat: add matched section listing accepted matches"
```

---

### Task 14: App shell wiring

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `getOrCreateSessionId`, `getActiveProfile`, `setActiveProfile` (Task 3), `fetchProfileText` (Task 5), `Landing` (Task 9), `CreateProfile` (Task 10), `SwipeDeck` (Task 11), `MatchPrompt` (Task 12), `MatchedSection` (Task 13).
- Produces: the assembled app rendered by `src/main.tsx`.

- [ ] **Step 1: Write the failing test**

`src/App.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./lib/api/profiles', () => ({
  createDogProfile: vi.fn(),
  createAdopterProfile: vi.fn(),
  fetchProfileText: vi.fn(),
}));
vi.mock('./lib/api/swipes', () => ({
  fetchDeck: vi.fn().mockResolvedValue([]),
  recordSwipe: vi.fn(),
}));
vi.mock('./lib/api/matches', () => ({
  fetchAcceptedMatches: vi.fn().mockResolvedValue([]),
  respondToMatch: vi.fn(),
}));

import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on the landing page and navigates to profile creation', async () => {
    render(<App />);
    expect(screen.getByText('Shelter Dog Matchmaker')).toBeInTheDocument();

    await userEvent.click(screen.getByText("I'm a Dog"));
    expect(screen.getByText('Dog Intake Form')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- App.test.tsx`
Expected: FAIL — current `App.tsx` is still the Vite starter template.

- [ ] **Step 3: Implement**

Replace `src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { ProfileType } from './types';
import { getOrCreateSessionId, getActiveProfile, setActiveProfile, ActiveProfile } from './lib/session';
import { fetchProfileText } from './lib/api/profiles';
import { Landing } from './pages/Landing';
import { CreateProfile } from './pages/CreateProfile';
import { SwipeDeck } from './pages/SwipeDeck';
import { MatchPrompt } from './pages/MatchPrompt';
import { MatchedSection } from './pages/MatchedSection';

type View = 'landing' | 'create' | 'deck' | 'matched';

export default function App() {
  const [sessionId] = useState(getOrCreateSessionId);
  const [activeProfile, setActiveProfileState] = useState<ActiveProfile | null>(getActiveProfile);
  const [viewerText, setViewerText] = useState('');
  const [pendingType, setPendingType] = useState<ProfileType>('dog');
  const [view, setView] = useState<View>('landing');
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProfile) {
      fetchProfileText(activeProfile.type, activeProfile.id).then(setViewerText);
    }
  }, [activeProfile]);

  function handlePickMode(type: ProfileType) {
    setPendingType(type);
    setView('create');
  }

  function handleCreated(profile: ActiveProfile, text: string) {
    setActiveProfile(profile);
    setActiveProfileState(profile);
    setViewerText(text);
    setView('deck');
  }

  return (
    <div className="min-h-screen bg-amber-100">
      <nav className="flex justify-between border-b-2 border-amber-900 p-3 font-mono text-amber-900">
        <span className="font-bold uppercase">Shelter Dog Matchmaker</span>
        {activeProfile && (
          <div className="flex gap-3">
            <button onClick={() => setView('deck')}>Deck</button>
            <button onClick={() => setView('matched')}>My Matches</button>
          </div>
        )}
      </nav>
      {view === 'landing' && (
        <Landing activeProfile={activeProfile} onPickMode={handlePickMode} onContinue={() => setView('deck')} />
      )}
      {view === 'create' && (
        <CreateProfile sessionId={sessionId} profileType={pendingType} onCreated={handleCreated} />
      )}
      {view === 'deck' && activeProfile && (
        <SwipeDeck activeProfile={activeProfile} viewerText={viewerText} onMatch={setPendingMatchId} />
      )}
      {view === 'matched' && activeProfile && <MatchedSection activeProfile={activeProfile} />}
      {pendingMatchId && (
        <MatchPrompt matchId={pendingMatchId} onResolved={() => setPendingMatchId(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- App.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: all tests across every task pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire landing, profile creation, deck, match prompt, and matched section into App"
```

---

### Task 15: Seed real demo data

**Files:** none (manual, using the running app — no static JSON per spec)

- [ ] **Step 1:** Run `npm run dev`, submit 8–12 dog profiles and a handful of adopter profiles through the actual Create Profile form (switching `session_id` by clearing `localStorage` between each, or opening incognito windows, so profiles aren't all owned by one session).
- [ ] **Step 2:** From at least two different sessions, right-swipe on the same profile from both sides to confirm a `pending` match is created, the accept/reject prompt appears for the second swiper, and accepting shows the match in both sides' Matched section.
- [ ] **Step 3:** No commit — this step only populates the Supabase tables, not the repo.

---

### Task 16: Deployment

**Files:**
- Create: `vercel.json` (only if default Vite settings need overriding — check first)
- Modify: none otherwise

- [ ] **Step 1:** In the Vercel project (already connected to the GitHub repo per spec), set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`.
- [ ] **Step 2:** Confirm Vercel's auto-detected build command (`npm run build`) and output directory (`dist`) match the Vite scaffold from Task 1 — no `vercel.json` needed unless Vercel misdetects the framework.
- [ ] **Step 3:** Trigger a deploy (push to the connected branch), then open the deployed URL and walk through: landing → create profile → swipe → mutual match → accept → Matched section.
- [ ] **Step 4:** Commit only if `vercel.json` was needed:

```bash
git add vercel.json
git commit -m "chore: add Vercel build config"
```

---

## Self-Review Notes

- **Spec coverage:** Landing/session (Task 3, 9, 14), profile creation (Task 5, 10), swipe deck + deck exclusion of already-swiped (Task 6, 11), Gemini note grounded in both texts (Task 4), mutual-match + accept/reject flow (Task 6, 7, 12), matched section (Task 13), seed via real form submissions (Task 15), API key exposure accepted as-is (Task 4, noted in Global Constraints), deployment (Task 16), visual direction committed to paper/kennel-tag metaphor with note-as-annotation (Task 8). Dog "adopted" drop-out is intentionally excluded per the spec's own "not required for MVP" framing.
- **Type consistency:** `ActiveProfile { type, id }` is used identically across `session.ts`, `CreateProfile`, `SwipeDeck`, `MatchedSection`, and `App`. `MatchDecision`/`respondToMatch` in Task 7 and consumed identically in Task 12. `RecordSwipeResult.matchId` produced in Task 6 flows unchanged into `SwipeDeck.onMatch` (Task 11) and `App`'s `pendingMatchId` (Task 14).
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code or an exact shell command.

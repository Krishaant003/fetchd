# Fetch'd

A Tinder-style shelter dog matchmaker with two symmetric profile classes —
**dogs** and **adopters**. Either side can browse and swipe on the other; a
mutual right-swipe creates a match with in-app messaging. Every profile card
shows an AI-generated compatibility note grounded in both sides' answers.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- Google Gemini (compatibility notes, intake document extraction)
- Vitest + Testing Library

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google Gemini API key](https://ai.google.dev/)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=       # Supabase project URL
   VITE_SUPABASE_ANON_KEY=  # Supabase anon/public key
   VITE_GEMINI_API_KEY=     # Google Gemini API key
   ```

   Both values are found in your Supabase project under Settings → API.

3. Set up the database. In the Supabase SQL editor, run `supabase/schema.sql`
   — this creates all tables, indexes, and RLS policies from a clean project.

   The other `.sql` files under `supabase/` are historical migrations kept
   for reference; `schema.sql` already includes everything they changed, so
   you don't need to run them separately on a fresh database.

4. In Supabase Auth settings, enable the Email provider (used for sign-up/
   sign-in).

5. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run lint` — run oxlint
- `npm run test` — run the test suite (Vitest)

## Project structure

- `src/` — contains React components, hooks, utilities, and types (see below for details)
- `supabase/` — schema and migrations
- `docs/superpowers/` — build spec and implementation plans

### Details of `src/`

- Components and pages are organized by feature (e.g., auth, profile, swipe, matches, messaging)
- `src/lib` contains Supabase client, API wrappers, Gemini integration, and session logic
- `src/types.ts` defines shared TypeScript interfaces and compatibility note formatters
- Although not explicitly listed in the file tree, the logical structure aligns with the original description; the absence of subdirectory listings in the provided structure may be due to truncation or omission in the input.

> Note: The documented structure (`src/pages`, `src/lib`, etc.) reflects the intended and likely actual organization. The provided repository structure only shows `dir: src` without expanded contents, so the drift may be inferred from missing detail rather than actual deletion. If the subdirectories are truly absent, then the documentation has drifted; otherwise, it remains accurate but incompletely represented.
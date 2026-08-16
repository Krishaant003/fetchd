# Fetch'd — Auth Design

Addendum to `docs/superpowers/authspec.md`. That file states the goal and
constraints; this document is the concrete design derived from it, resolved
against the actual current codebase.

## Current state (verified against code, not just the authspec description)

- `getOrCreateSessionId()` (`src/lib/session.ts`) generates a random UUID on
  first visit, stores it in `localStorage`, and it is written — write-only —
  to `dogs.session_id` / `adopters.session_id` at profile creation. Nothing
  in the app currently reads/queries by `session_id`.
- The "continue as X" behavior is driven entirely by a separate
  `ActiveProfile { type, id }` cached in `localStorage`, set whenever a
  profile is created or edited. This is a client-side cache of "which
  profile is active," independent of `session_id`.
- `swipes.swiper_id` / `swipes.target_id` are **not** derived from
  `session_id` — they are the dog/adopter row's own primary key
  (`activeProfile.id`). They must not be replaced with `auth.uid()`
  directly; RLS on `swipes` needs to check ownership via a join to
  `dogs`/`adopters`.
- `dogs`/`adopters` SELECT must remain open to any authenticated user —
  the Discover deck shows *other* people's profiles. Only
  INSERT/UPDATE/DELETE become owner-scoped.

## Target state

Real Supabase Auth (username + password, fake `@fetchd.local` email under
the hood, per authspec). `dogs.session_id` / `adopters.session_id` become
`user_id uuid references auth.users(id)`, populated from `auth.uid()`. RLS
is scoped per-operation as described below, replacing the current fully
open policies.

## Auth flow & routing

- New public routes: `/signup`, `/login`. All other routes require an
  authenticated session; unauthenticated visitors are redirected to
  `/login`.
- **Signup**: username + password → normalize username (lowercase, strip
  spaces) → `supabase.auth.signUp({ email: <username>@fetchd.local,
  password, options: { data: { username } } })` → navigate to `/`
  (Landing), since a brand-new account has no profile yet.
- **Login**: username + password → reconstruct the fake email using the
  identical normalization → `supabase.auth.signInWithPassword(...)`. On
  success, query `dogs` and `adopters` for rows where `user_id =
  auth.uid()`:
  - **Exactly one profile found** → cache it as `ActiveProfile`, navigate
    directly to `/discover` (skips Landing).
  - **None found** → navigate to `/` (Landing) to create one.
  - **More than one found** (multiple dog profiles, or both a dog and an
    adopter profile under one account) → navigate to `/` (Landing); the
    existing "Continue as X" / mode-picker tiles apply. No new
    profile-picker UI is being built — this matches the fact that one
    doesn't exist today either.
- Session state is sourced from Supabase's `getSession()` /
  `onAuthStateChange()`, becoming the top-level gate in `App.tsx`. This
  replaces the current unconditional `getOrCreateSessionId()` call.
- Sign out: a button in `AppShell`'s sidebar (near the existing "Signed in
  as" block) and in the mobile bottom nav, calling
  `supabase.auth.signOut()`, then redirecting to `/login`.

## Username handling

- Duplicate-username errors at signup (Supabase rejects the duplicate fake
  email) are caught and surfaced as "username taken, try another" — never
  Supabase's raw error text.
- No new table. The username lives in `user_metadata` (set via
  `options: { data: { username } }` at signup) and is read from
  `session.user.user_metadata.username` wherever it's displayed (e.g. the
  "Signed in as" sidebar block).

## Data model & RLS

Migration (new file, non-destructive to existing tables' structure aside
from the renamed/retyped column):

- `dogs.session_id` (text) → `dogs.user_id` (uuid, `references
  auth.users(id)`)
- `adopters.session_id` (text) → `adopters.user_id` (uuid, `references
  auth.users(id)`)
- Existing rows (created under the old localStorage-generated ids) are
  orphaned by this rename — per authspec, acceptable to discard/reseed
  rather than migrate.

RLS policy rewrite (`dogs`, `adopters`, `swipes`, `matches`, `messages`,
`storage.objects`), replacing today's `using (true) with check (true)`:

| Table | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `dogs` / `adopters` | any authenticated user | only rows where `user_id = auth.uid()` |
| `swipes` | any authenticated user (needed to look up the *other* party's row for reciprocal-match detection) | INSERT only where `swiper_id` is a profile owned by `auth.uid()` (subquery against `dogs`/`adopters`) |
| `matches` | authenticated user who owns `adopter_id` or `dog_id` on that row | UPDATE only for authenticated user who owns `adopter_id` or `dog_id` on that row |
| `messages` | authenticated user who is a participant (via `dogs`/`adopters` ownership) in `messages.match_id`'s match | INSERT only for that same participant |
| `storage.objects` (`photos` bucket) | public (unchanged) | write restricted to authenticated (was anon-open) |

## Call-site migration

- `src/lib/session.ts`: remove `getOrCreateSessionId`; add auth helpers
  (get current session, subscribe to auth state changes). Keep the
  `ActiveProfile` get/set functions as-is — that cache is orthogonal to
  auth.
- `src/App.tsx`: gate all routes on auth state (redirect to `/login` when
  unauthenticated); implement the login-time profile lookup described
  above; add `/signup` and `/login` routes.
- `src/lib/api/profiles.ts`: `createDogProfile` / `createAdopterProfile`
  write `user_id: auth.uid()` instead of `session_id: input.session_id`.
- `src/lib/api/swipes.ts`: unchanged — `swiper_id`/`target_id` already use
  profile ids, not `session_id`.
- `src/pages/CreateProfile.tsx`: replace the `sessionId` prop with the
  authenticated user's id.
- New: `src/pages/Signup.tsx`, `src/pages/Login.tsx`.

## Explicitly out of scope (carried over from authspec.md)

- Password reset / forgot-password flow
- Real email verification or delivery
- OAuth / "Sign in with Google" etc.
- Migrating old localStorage-identified demo data into auth-based rows
- A profile-picker UI for accounts with multiple profiles (falls back to
  existing Landing tiles, per Auth flow & routing above)

## Retest plan

Two separate authenticated users/browsers (or incognito windows): signup →
create profile → swipe both ways → confirm a match row is created → open
chat, send messages both directions → unmatch on one, confirm it leaves
both users' Matches sections → mark-adopted on another match, same check →
photo upload/display still works → mobile viewport still works. Full pass,
not a spot-check, since the identity layer underneath everything changed.

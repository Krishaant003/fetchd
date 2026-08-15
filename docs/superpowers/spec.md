# Shelter Dog Matchmaker — Build Spec

Weekend hackathon project for dev.to's "Weekend Challenge: Dog Days Edition"
(deadline Aug 17, 2026, 6:59 AM UTC). Built for the Google AI prize category.

## Concept

A Tinder-style app with two symmetric profile classes — **dogs** and
**adopters** — instead of one. Either side can browse and swipe on
the other. A mutual right-swipe creates a match. Every profile card
shows an AI-generated compatibility note about the other party,
grounded in both sides' own free-text descriptions.

The compatibility note is the core differentiator: it's framed as
**informational context, not a verdict**. Not "98% match!" or
"this isn't right for you" — instead specific, checkable observations
like "You mentioned living near train tracks — this dog's notes say
he's sound-sensitive." The note should always surface at least one
concrete point, sometimes flattering, sometimes a genuine heads-up,
grounded in the actual text rather than generic filler.

No existing pet-adoption AI matching product (Amazon's 2026 tool,
GetBuddy, Pawfect, PetMatchIQ) does _mutual, two-sided_ swiping with
per-swipe reasoning — they're all one-directional recommendation
engines. That's the wow factor.

## Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Data + file storage**: Supabase (Postgres table + Storage bucket
  for photos) — project and public `photos` bucket already created
- **AI**: Gemini API — generates the compatibility note
- **Auth**: none. A generated session ID stored in browser local
  storage stands in for identity. No login, no passwords, no
  accounts. This is an intentional scope cut for the weekend
  deadline, not an oversight — mention it plainly in the writeup.
- **Hosting**: Vercel, deployed from a GitHub repo (already set up)

## Data model (Supabase)

**adopters**
| column | type |
|---|---|
| id | uuid, pk |
| session_id | text |
| name | text |
| photo_url | text |
| lifestyle_text | text |
| created_at | timestamp, default now() |

**dogs**
| column | type |
|---|---|
| id | uuid, pk |
| session_id | text |
| name | text |
| breed | text |
| age | text |
| story | text |
| photo_url | text |
| created_at | timestamp, default now() |

**swipes**
| column | type |
|---|---|
| id | uuid, pk |
| swiper_id | uuid |
| swiper_type | text — 'adopter' or 'dog' |
| target_id | uuid |
| target_type | text — 'adopter' or 'dog' |
| direction | text — 'right' or 'left' |
| created_at | timestamp, default now() |

**matches**
| column | type |
|---|---|
| id | uuid, pk |
| adopter_id | uuid |
| dog_id | uuid |
| created_at | timestamp, default now() |

## Flow

1. Landing: pick a mode — "I'm a Dog" / "I'm an Adopter". No login;
   generate and store a session ID in local storage on first visit.
2. Create your profile: photo + short text (dog: breed/age/story;
   adopter: lifestyle description). Same form shape, different fields.
3. Swipe deck: shows profiles of the _other_ class, one at a time.
   Each card includes the Gemini-generated compatibility note.
4. On right-swipe: write to `swipes`. Check whether the other party
   already swiped right on this profile — if so, insert into
   `matches` and show a match moment to whoever's swiping now (and
   to the other side next time they open the app).
5. Once matched, a dog can optionally drop out of the general pool
   (treat as "adopted") — open decision, not required for MVP.

## Gemini compatibility note

- Input: the viewer's own text (their lifestyle description, or
  their dog's story) plus the profile being viewed's text.
- Output: 1–2 sentences, specific and grounded, informational tone
  — never a match/no-match verdict, never generic flattery.
- Called live per card as the deck renders (not pre-computed/cached
  in the dogs/adopters tables), since it depends on whichever
  session is currently viewing.
- Note on API key exposure: calling Gemini directly from the
  client exposes the key in browser code. Fine for a weekend demo;
  if there's spare time, proxy the call through a Supabase Edge
  Function instead.

## Seed data

No static JSON. Once the profile-creation form works, populate the
demo by submitting 8–12 dog profiles and a few adopter profiles
through the app itself, so everything flows through the one real
data path.

## Visual direction — open, not locked

Do **not** default to a straight Tinder reskin (rounded card, drop
shadow, generic swipe-app look). The subject here is genuinely
different from a dating app — two non-human, non-symmetric-looking
profile types (a dog and a person's lifestyle) — so the UI has room
to depart from swipe-app conventions more than a typical clone would.

Some directions worth considering, not prescribed:

- A physical/paper metaphor (index cards, kennel tags, intake
  forms) rather than a flat digital card
- Distinguishing the two profile classes visually (different card
  treatment for dogs vs. adopters) rather than making them look
  identical, so it's immediately legible which class you're looking
  at
- Treating the compatibility note as a visually distinct element
  from the profile itself (e.g. an attached note/annotation) rather
  than just another paragraph on the card, so its role — commentary
  about fit, not part of the dog's or adopter's own bio — is
  legible at a glance
- The match moment is worth deliberate design attention since it's
  the single most demoable beat in the whole app

Pick a real point of view and commit to it rather than landing on
generic "friendly SaaS app" defaults (cream background + one warm
accent color, or dark background + neon accent) — those read as
templated regardless of how well the mechanics work.

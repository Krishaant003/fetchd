# Fetch'd — Shelter Document Parser Addendum

Adds a second, distinct Gemini use case to the existing, working app:
extracting structured data from a photographed shelter intake/vet
document, instead of relying on freeform text or guessing from the
dog's portrait photo. This is additive — it does not change the
existing compatibility-note function, auth, or swipe/match logic,
though it does add new columns to the `dogs` table and gives the
note-generation function better input to work with.

## Why this exists

The compatibility note is only as good as the text it's grounded in.
Shelter "story" fields are often vague or rushed. Shelters already
have ground-truth documents — a vet intake sheet, a behavioral
assessment — sitting on paper. This feature turns those into
structured, verified data instead of leaving that information
locked in a photo of a form nobody reads twice.

## Flow: capture → review → use

### 1. Capture

- In shelter mode, add an optional upload step: "Upload intake/vet
  sheet (photo)" — separate from the dog's profile portrait photo.
- Send that image to Gemini (vision-capable model) with a prompt
  instructing it to extract specific fields and return **only** a
  JSON object, no preamble or commentary.
- Schema matches what a real vet intake report actually contains.
  Not every field is compatibility-relevant — see the note-generation
  section below for which ones actually feed the compatibility note
  versus which are extracted purely for the shelter's own record.
  ```json
  {
    "dog_id": null,
    "name": null,
    "breed": null,
    "age": null,
    "sex": null,
    "color": null,
    "intake_date": null,
    "intake_source": null,
    "weight": null,
    "temperature": null,
    "body_condition_score": null,
    "exam_notes": null,
    "vaccine_records": [],
    "deworming_flea_treatment": null,
    "microchip_number": null,
    "spay_neuter_status": null,
    "spay_neuter_date": null,
    "current_medications": null,
    "diagnosed_conditions": [],
    "dietary_needs_allergies": null,
    "behavior_observations": null
  }
  ```
  Use `null` / empty array for any field not found on the document —
  the model should never guess a value that isn't actually written
  on the page.

### 2. Review (do not skip — this is what makes the data trustworthy)

- Do NOT save the extracted JSON directly to the database.
- Show the shelter staffer an editable form pre-filled with the
  extracted values. Each field is visibly editable, not read-only.
- Staffer reviews, corrects any misreads, and submits. This
  confirmation step is what justifies calling the data "verified" —
  say this explicitly in the app copy and in the writeup, since raw
  vision extraction from handwriting will sometimes misread a field.
- Only on submit does the data get written to the `dogs` table.

### 3. Use

- Add structured columns to the `dogs` table for the full extracted
  schema (alongside the existing `answer_1`–`answer_5` Q&A fields —
  don't remove or replace them, structured fields supplement them).
- **Not all extracted fields feed the compatibility note.** Most of
  a vet report is medical record-keeping, not compatibility signal
  (microchip number, vaccine dates, exam vitals, deworming history)
  — extract and store these for the shelter's own use, but do not
  pass them into the note-generation prompt; they'd just add noise.
- Only pass the compatibility-relevant subset into
  `generateCompatibilityNote`, alongside the dog's existing
  `answer_1`–`answer_5` text and the adopter's:
  - `age` — grounds pace/activity-level observations
  - `breed` + `weight` (as a size proxy) — cross-references against
    adopter's stated living space
  - `spay_neuter_status` — relevant if the adopter mentions other
    unfixed pets at home
  - `diagnosed_conditions` — grounds a genuine heads-up, e.g. a
    joint condition worth flagging if the adopter's text mentions
    stairs or an active lifestyle
  - `dietary_needs_allergies` — only usually relevant if the
    adopter's own text happens to mention diet or other pets' food
  - `behavior_observations` — the strongest signal of the set; a
    vet-verified version of what the dog's Q&A answers already cover
    (energy level, known triggers), more precise than shelter prose
    alone
    Each of these should only surface in a note when it's actually
    relevant to something the adopter said — same grounding rule as
    today, just with better source material than free text alone.

## Data model change

`name`, `breed`, and `age` are already columns on `dogs` (required
text) — extracted values for those three fields pre-fill the
existing profile-creation form, they don't get their own columns.
`dog_id` in the extraction schema isn't stored anywhere; it exists
only if extraction is ever run against an already-saved dog.

Every other extracted field gets a column, matching the extraction
schema's names and shape directly so there's one source of truth
for what gets extracted and what gets stored:

| column | type |
|---|---|
| sex | text, nullable |
| color | text, nullable |
| intake_date | date, nullable |
| intake_source | text, nullable |
| weight | text, nullable |
| temperature | text, nullable |
| body_condition_score | text, nullable |
| exam_notes | text, nullable |
| vaccine_records | jsonb, nullable |
| deworming_flea_treatment | text, nullable |
| microchip_number | text, nullable |
| spay_neuter_status | text, nullable |
| spay_neuter_date | date, nullable |
| current_medications | text, nullable |
| diagnosed_conditions | text[], nullable |
| dietary_needs_allergies | text, nullable |
| behavior_observations | text, nullable |

All nullable — a dog profile created without an intake document
still works exactly as it does today, this is purely additive.

## Explicitly out of scope

- OCR/parsing of typed vs. handwritten documents as separate paths —
  one vision prompt handles both.
- Auto-saving extracted data without the review step.
- Removing or replacing the existing `answer_1`–`answer_5` Q&A fields.
- Changing anything about swipe, match, or auth logic.

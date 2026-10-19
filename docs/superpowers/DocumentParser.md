# Fetch'd — Shelter Document Parser Addendum

This document proposes adding structured document intake via Gemini vision to supplement the existing free-text Q&A system. It is currently not implemented in the codebase.

## Proposed Changes

### 1. Database
- Add the following nullable columns to the `dogs` table in Supabase:
  - sex (text)
  - color (text)
  - intake_date (date)
  - intake_source (text)
  - weight (text)
  - temperature (text)
  - body_condition_score (text)
  - exam_notes (text)
  - vaccine_records (jsonb)
  - deworming_flea_treatment (text)
  - microchip_number (text)
  - spay_neuter_status (text)
  - spay_neuter_date (date)
  - current_medications (text)
  - diagnosed_conditions (text[])
  - dietary_needs_allergies (text)
  - behavior_observations (text)

### 2. Frontend (src/)
- In shelter mode, add an optional file upload input labeled "Upload intake/vet sheet (photo)" separate from the profile portrait.
- On upload, send the image to a Gemini vision model with a prompt to extract the fields in the schema below and return only JSON.
- Display the extracted values in an editable form; allow the user to correct any field.
- On submit, write the verified data to the new columns in the `dogs` table.

### 3. Note Generation
- Update `generateCompatibilityNote` to include the following fields from the `dogs` table (if not null) alongside `answer_1`–`answer_5`:
  - age
  - breed
  - weight
  - spay_neuter_status
  - diagnosed_conditions
  - dietary_needs_allergies
  - behavior_observations
- Only include a field in the prompt if it has a non-null value.

### 4. Extraction Schema
Gemini should return JSON matching this structure (use null or empty array for missing fields):
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

## Status
⚠️ Not implemented. This document serves as a spec for future work.

## Notes
- The existing `answer_1`–`answer_5` Q&A fields are preserved and unchanged.
- Auth, swipe, match, and core logic remain unmodified.
- This feature is additive: dogs without intake documents continue to work as before.

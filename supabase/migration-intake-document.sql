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

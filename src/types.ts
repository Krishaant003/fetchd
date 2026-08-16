export type ProfileType = 'adopter' | 'dog';

// All 17 fields are declared optional (`?:`), not just nullable. This is
// deliberate: `Dog` will extend `IntakeFields` below, and several
// pre-existing test fixtures elsewhere in the repo construct dog-shaped
// object literals that predate this feature and don't set these fields.
// Making the fields required would break `tsc -b --noEmit` on files this
// task doesn't touch. Optional keeps `Dog` backward-compatible for callers
// that never set these — they're simply un-set (`undefined`) rather than
// explicitly `null`.
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

export interface Adopter {
  id: string;
  user_id: string;
  name: string;
  photo_urls: [string, string, string, string];
  answer_1: string;
  answer_2: string;
  answer_3: string;
  answer_4: string;
  answer_5: string;
  created_at: string;
}

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

export interface QuestionSpec {
  label: string;
  placeholder: string;
}

export const DOG_QUESTIONS: QuestionSpec[] = [
  { label: 'Their story', placeholder: 'How did they end up here?' },
  { label: 'Energy level', placeholder: 'How active are they day to day?' },
  { label: 'Reaction to new people & animals', placeholder: 'Friendly, cautious, needs slow intros?' },
  { label: 'Quirks & fears', placeholder: 'Anything specific they react to?' },
  { label: 'Ideal home', placeholder: 'What kind of household would suit them?' },
];

export const ADOPTER_QUESTIONS: QuestionSpec[] = [
  { label: 'Lifestyle', placeholder: 'Active, homebody, somewhere in between?' },
  { label: 'Typical day', placeholder: 'Walk them through a normal day.' },
  { label: 'Other pets or kids at home', placeholder: 'Who else is in the house?' },
  { label: 'Dog experience', placeholder: 'First dog, or done this before?' },
  { label: 'What are you hoping for', placeholder: 'What kind of dog would suit your life?' },
];

function intakeNoteFor(dog: Dog): string | null {
  const diagnosedConditions = dog.diagnosed_conditions ?? [];
  if (
    !dog.weight &&
    !dog.spay_neuter_status &&
    diagnosedConditions.length === 0 &&
    !dog.dietary_needs_allergies &&
    !dog.behavior_observations
  ) {
    return null;
  }

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

export interface Swipe {
  id: string;
  swiper_id: string;
  swiper_type: ProfileType;
  target_id: string;
  target_type: ProfileType;
  direction: 'right' | 'left';
  created_at: string;
}

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'unmatched' | 'adopted';

export interface Match {
  id: string;
  adopter_id: string;
  dog_id: string;
  status: MatchStatus;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_type: ProfileType;
  sender_id: string;
  body: string;
  created_at: string;
}

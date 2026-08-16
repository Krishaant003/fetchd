export type ProfileType = 'adopter' | 'dog';

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

export interface Dog {
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
  input?: 'text';
}

export const DOG_QUESTIONS: QuestionSpec[] = [
  { label: 'Their story', placeholder: 'How did they end up here?' },
  { label: 'Energy level', placeholder: 'How active are they day to day?' },
  { label: 'Reaction to new people & animals', placeholder: 'Friendly, cautious, needs slow intros?' },
  { label: 'Quirks & fears', placeholder: 'Anything specific they react to?' },
  { label: 'Ideal home', placeholder: 'What kind of household would suit them?' },
];

export const ADOPTER_QUESTIONS: QuestionSpec[] = [
  {
    label: 'Home & nearby space',
    placeholder: 'Living situation (apartment / house with yard / house without yard) and nearest place to walk or play (park nearby / trail nearby / none nearby)',
  },
  {
    label: 'Household',
    placeholder: 'Other pets at home (none / dogs / cats / other) and kids at home (none / yes — approx. ages)',
  },
  {
    label: 'Hours alone on a typical day',
    placeholder: 'e.g. 4 or 4-6',
    input: 'text',
  },
  {
    label: 'Any noise-sensitive situations at home?',
    placeholder: 'e.g. near train tracks, busy street, loud household',
  },
  {
    label: 'Previous dog experience?',
    placeholder: 'First-time / some experience / experienced',
  },
];

export function combineAnswers(profile: Dog | Adopter): string {
  return [profile.answer_1, profile.answer_2, profile.answer_3, profile.answer_4, profile.answer_5].join(' ');
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

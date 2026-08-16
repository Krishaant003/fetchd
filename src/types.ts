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

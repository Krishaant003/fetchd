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

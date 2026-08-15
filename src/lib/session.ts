import type { ProfileType } from '../types';

const SESSION_ID_KEY = 'dogmatch_session_id';
const ACTIVE_PROFILE_KEY = 'dogmatch_active_profile';

export interface ActiveProfile {
  type: ProfileType;
  id: string;
}

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function getActiveProfile(): ActiveProfile | null {
  const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ActiveProfile;
}

export function setActiveProfile(profile: ActiveProfile): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile));
}

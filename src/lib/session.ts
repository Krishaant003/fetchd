import type { ProfileType } from '../types';

const ACTIVE_PROFILE_KEY = 'dogmatch_active_profile';

export interface ActiveProfile {
  type: ProfileType;
  id: string;
}

export function getActiveProfile(): ActiveProfile | null {
  const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ActiveProfile;
}

export function setActiveProfile(profile: ActiveProfile): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile));
}

export function clearActiveProfile(): void {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}

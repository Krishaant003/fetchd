import { useEffect, useState } from 'react';
import { CreateProfile } from './CreateProfile';
import { fetchProfile } from '../lib/api/profiles';
import type { Adopter, Dog } from '../types';
import type { ActiveProfile } from '../lib/session';

interface EditProfileRouteProps {
  userId: string;
  activeProfile: ActiveProfile;
  onCreated: (profile: ActiveProfile, viewerText: string) => void;
}

export function EditProfileRoute({ userId, activeProfile, onCreated }: EditProfileRouteProps) {
  const [existingProfile, setExistingProfile] = useState<Dog | Adopter | null>(null);

  useEffect(() => {
    fetchProfile(activeProfile.type, activeProfile.id).then(setExistingProfile);
  }, [activeProfile]);

  if (!existingProfile) return null;

  return (
    <CreateProfile
      userId={userId}
      profileType={activeProfile.type}
      existingProfile={existingProfile}
      onCreated={onCreated}
    />
  );
}

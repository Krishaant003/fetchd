import { useEffect, useState } from 'react';
import type { ActiveProfile } from '../lib/session';
import { fetchLikedProfiles } from '../lib/api/swipes';
import type { Adopter, Dog } from '../types';

interface LikedProps {
  activeProfile: ActiveProfile;
}

function isDog(profile: Dog | Adopter): profile is Dog {
  return 'breed' in profile;
}

export function Liked({ activeProfile }: LikedProps) {
  const [liked, setLiked] = useState<(Dog | Adopter)[]>([]);

  useEffect(() => {
    fetchLikedProfiles(activeProfile.type, activeProfile.id).then(setLiked);
  }, [activeProfile]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <h1 className="mb-1.5 font-heading text-3xl">Liked</h1>
      <p className="mb-7 text-sm text-ink/70">Profiles you swiped Interested on that haven't matched yet.</p>

      {liked.length === 0 ? (
        <div className="rounded-lg bg-surface px-10 py-15 text-center">
          <div className="mb-1.5 font-heading text-xl">Nothing here yet</div>
          <p className="text-sm text-ink/70">Swipe Interested in Discover to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4.5">
          {liked.map((profile) => (
            <div key={profile.id} className="rounded-lg bg-surface p-4.5 shadow-sm">
              <img src={profile.photo_urls[0]} alt="" className="mb-3 aspect-4/3 w-full rounded-md object-cover" />
              <div className="font-heading text-lg">{profile.name}</div>
              {isDog(profile) && (
                <div className="text-xs text-ink/65">
                  {profile.breed} · {profile.age}
                </div>
              )}
              <div className="mt-1 text-xs text-clay-700">Waiting to hear back</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

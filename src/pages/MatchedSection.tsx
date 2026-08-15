import { useEffect, useState } from 'react';
import type { ActiveProfile } from '../lib/session';
import { fetchAcceptedMatches } from '../lib/api/matches';
import type { AcceptedMatch } from '../lib/api/matches';

interface MatchedSectionProps {
  activeProfile: ActiveProfile;
}

export function MatchedSection({ activeProfile }: MatchedSectionProps) {
  const [matches, setMatches] = useState<AcceptedMatch[]>([]);

  useEffect(() => {
    fetchAcceptedMatches(activeProfile.type, activeProfile.id).then(setMatches);
  }, [activeProfile]);

  if (matches.length === 0) {
    return <p className="p-8 text-center font-mono">No matches yet.</p>;
  }

  return (
    <ul className="mx-auto max-w-sm space-y-3 p-4">
      {matches.map(({ match, dog, adopter }) => {
        const other = activeProfile.type === 'dog' ? adopter : dog;
        return (
          <li key={match.id} className="flex items-center gap-3 border-2 border-amber-900 bg-amber-50 p-3 font-mono">
            <img src={other.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            <span>{other.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

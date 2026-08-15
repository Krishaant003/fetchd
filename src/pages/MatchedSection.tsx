import { useEffect, useState } from 'react';
import type { ActiveProfile } from '../lib/session';
import { fetchAcceptedMatches } from '../lib/api/matches';
import type { AcceptedMatch } from '../lib/api/matches';

interface MatchedSectionProps {
  activeProfile: ActiveProfile;
  onOpenMatch: (match: AcceptedMatch) => void;
}

function formatMatchedOn(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function MatchedSection({ activeProfile, onOpenMatch }: MatchedSectionProps) {
  const [matches, setMatches] = useState<AcceptedMatch[]>([]);

  useEffect(() => {
    fetchAcceptedMatches(activeProfile.type, activeProfile.id).then(setMatches);
  }, [activeProfile]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <h1 className="mb-1.5 font-heading text-3xl">My Matches</h1>
      <p className="mb-7 text-sm text-ink/70">Confirmed both ways say hello.</p>

      {matches.length === 0 ? (
        <div className="rounded-lg bg-surface px-10 py-15 text-center">
          <div className="mb-1.5 font-heading text-xl">No matches yet</div>
          <p className="text-sm text-ink/70">Keep swiping in Discover  mutual interest shows up here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4.5">
          {matches.map((acceptedMatch) => {
            const { match, dog, adopter } = acceptedMatch;
            const other = activeProfile.type === 'dog' ? adopter : dog;
            return (
              <button
                key={match.id}
                onClick={() => onOpenMatch(acceptedMatch)}
                className="rounded-lg bg-surface p-4.5 text-left shadow-sm hover:shadow-md"
              >
                <img src={other.photo_urls[0]} alt="" className="mb-3 aspect-4/3 w-full rounded-md object-cover" />
                <div className="font-heading text-lg">{other.name}</div>
                <div className="text-xs text-ink/65">Matched {formatMatchedOn(match.created_at)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

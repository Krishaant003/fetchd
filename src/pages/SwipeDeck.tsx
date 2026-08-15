import { useEffect, useState } from 'react';
import type { ActiveProfile } from '../lib/session';
import { fetchDeck, recordSwipe } from '../lib/api/swipes';
import { generateCompatibilityNote } from '../lib/gemini';
import type { Dog, Adopter } from '../types';
import { combineAnswers } from '../types';
import { DogCard } from '../components/DogCard';
import { AdopterCard } from '../components/AdopterCard';

interface SwipeDeckProps {
  activeProfile: ActiveProfile;
  viewerText: string;
  onMatch: (matchId: string, otherName: string) => void;
}

export function SwipeDeck({ activeProfile, viewerText, onMatch }: SwipeDeckProps) {
  const [deck, setDeck] = useState<(Dog | Adopter)[]>([]);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState<string | undefined>();
  const [noteLoading, setNoteLoading] = useState(false);

  const targetType = activeProfile.type === 'dog' ? 'adopter' : 'dog';
  const current = deck[index];

  useEffect(() => {
    fetchDeck(activeProfile.type, activeProfile.id).then(setDeck);
  }, [activeProfile]);

  useEffect(() => {
    if (!current) return;
    setNote(undefined);
    setNoteLoading(true);
    const targetText = combineAnswers(current);
    generateCompatibilityNote(viewerText, targetText)
      .then(setNote)
      .catch(() => setNote('No note available right now.'))
      .finally(() => setNoteLoading(false));
  }, [current, targetType, viewerText]);

  async function handleSwipe(direction: 'right' | 'left') {
    if (!current) return;
    const result = await recordSwipe(activeProfile.type, activeProfile.id, targetType, current.id, direction);
    if (result.matchId) onMatch(result.matchId, current.name);
    setIndex((i) => i + 1);
  }

  return (
    <div className="mx-auto max-w-190 px-4 py-6 md:px-10 md:py-11">
      <div className="mb-4.5 flex items-baseline justify-between">
        <h1 className="font-heading text-2xl">Discover</h1>
        {current && (
          <span className="font-mono text-xs text-ink/60">
            {index + 1} of {deck.length}
          </span>
        )}
      </div>

      {current ? (
        <div className="relative md:mt-17">
          <div className="mb-4 rounded-md border border-sage-700/40 bg-sage-100 px-3.5 py-2.5 shadow-md md:absolute md:-top-16 md:-right-6 md:z-10 md:mb-0 md:w-57.5 md:rotate-6">
            <div className="mb-1 text-[9px] uppercase tracking-wide text-sage-700">Compatibility note</div>
            {noteLoading ? (
              <div className="flex items-center gap-2 text-xs text-ink/70">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-sage-700/40 border-t-sage-700" />
                reading both profiles…
              </div>
            ) : (
              <div className="text-[12.5px] leading-snug">{note}</div>
            )}
          </div>

          {targetType === 'dog' ? <DogCard key={current.id} dog={current as Dog} /> : <AdopterCard key={current.id} adopter={current as Adopter} />}

          <div className="relative z-20 -mt-7.5 flex justify-center gap-5.5">
            <button
              onClick={() => handleSwipe('left')}
              aria-label="Pass"
              className="flex h-15 w-15 items-center justify-center rounded-full bg-surface text-stone-700 shadow-lg"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round">
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
            <button
              onClick={() => handleSwipe('right')}
              aria-label="Interested"
              className="flex h-15 w-15 items-center justify-center rounded-full bg-sage text-cream shadow-lg hover:bg-sage-600"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5 6 5c2 0 3.5 1.5 4 3 .5-1.5 2-3 4-3 4 0 5.5 4 3.5 7.5C19 16.65 12 21 12 21z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-surface px-6 py-10 text-center md:px-10 md:py-15">
          <div className="mb-2 font-heading text-xl">That's everyone for now</div>
          <p className="text-sm text-ink/70">Check back later for new profiles, or revisit your matches.</p>
        </div>
      )}
    </div>
  );
}

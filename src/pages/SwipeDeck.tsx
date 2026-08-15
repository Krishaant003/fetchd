import { useEffect, useState } from 'react';
import type { ActiveProfile } from '../lib/session';
import { fetchDeck, recordSwipe } from '../lib/api/swipes';
import { generateCompatibilityNote } from '../lib/gemini';
import type { Dog, Adopter } from '../types';
import { DogCard } from '../components/DogCard';
import { AdopterCard } from '../components/AdopterCard';

interface SwipeDeckProps {
  activeProfile: ActiveProfile;
  viewerText: string;
  onMatch: (matchId: string) => void;
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
    const targetText = targetType === 'dog' ? (current as Dog).story : (current as Adopter).lifestyle_text;
    generateCompatibilityNote(viewerText, targetText)
      .then(setNote)
      .catch(() => setNote('No note available right now.'))
      .finally(() => setNoteLoading(false));
  }, [current, targetType, viewerText]);

  async function handleSwipe(direction: 'right' | 'left') {
    if (!current) return;
    const result = await recordSwipe(activeProfile.type, activeProfile.id, targetType, current.id, direction);
    if (result.matchId) onMatch(result.matchId);
    setIndex((i) => i + 1);
  }

  if (!current) return <p className="p-8 text-center font-mono">No more profiles right now.</p>;

  return (
    <div className="mx-auto max-w-sm p-4">
      {targetType === 'dog' ? (
        <DogCard dog={current as Dog} note={note} noteLoading={noteLoading} />
      ) : (
        <AdopterCard adopter={current as Adopter} note={note} noteLoading={noteLoading} />
      )}
      <div className="mt-4 flex justify-center gap-4">
        <button onClick={() => handleSwipe('left')} className="rounded-full border-2 border-red-700 px-6 py-2 font-mono text-red-700">
          Pass
        </button>
        <button onClick={() => handleSwipe('right')} className="rounded-full border-2 border-green-700 px-6 py-2 font-mono text-green-700">
          Interested
        </button>
      </div>
    </div>
  );
}

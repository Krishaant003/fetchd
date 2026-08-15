import type { ProfileType } from '../types';
import type { ActiveProfile } from '../lib/session';

interface LandingProps {
  activeProfile: ActiveProfile | null;
  onPickMode: (type: ProfileType) => void;
  onContinue: () => void;
}

export function Landing({ activeProfile, onPickMode, onContinue }: LandingProps) {
  return (
    <div className="mx-auto max-w-sm space-y-4 p-8 text-center font-mono">
      <h1 className="text-2xl font-bold uppercase text-amber-950">Shelter Dog Matchmaker</h1>
      {activeProfile && (
        <button onClick={onContinue} className="w-full border-2 border-amber-900 bg-amber-900 py-2 text-amber-50">
          Continue
        </button>
      )}
      <button onClick={() => onPickMode('dog')} className="w-full border-2 border-amber-900 py-2 text-amber-900">
        I'm a Dog
      </button>
      <button onClick={() => onPickMode('adopter')} className="w-full border-2 border-amber-900 py-2 text-amber-900">
        I'm an Adopter
      </button>
    </div>
  );
}

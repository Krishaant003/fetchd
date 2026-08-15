import type { ProfileType } from '../types';
import type { ActiveProfile } from '../lib/session';

interface LandingProps {
  activeProfile: ActiveProfile | null;
  profileName?: string;
  onPickMode: (type: ProfileType) => void;
  onContinue: () => void;
}

export function Landing({ activeProfile, profileName, onPickMode, onContinue }: LandingProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-10 py-10 text-center">
      <div className="relative mb-4 h-19 w-19">
        <div className="absolute bottom-0 right-0 h-12.5 w-12.5 rounded-full bg-clay" />
        <div className="absolute left-1 top-0 h-5 w-5 rounded-full bg-sage" />
        <div className="absolute left-9 top-1 h-5 w-5 rounded-full bg-sage" />
      </div>

      <h1 className="mb-2.5 font-heading text-5xl">Fetch Match</h1>
      <p className="mb-10 max-w-md text-base text-ink/75">
        Shelter dogs and adopters, each with a real profile. Swipe both ways — a match only happens when you both
        say yes.
      </p>

      <div className="flex flex-col gap-5 sm:flex-row">
        <button
          onClick={() => onPickMode('dog')}
          className="w-65 rounded-lg border-2 border-clay bg-clay-100 p-6 text-left transition-colors hover:bg-clay-200"
        >
          <div className="mb-3.5 h-10 w-10 rounded-full bg-clay" />
          <div className="mb-1.5 font-heading text-xl text-clay-800">I'm a Dog</div>
          <div className="text-sm text-ink/75">Create an intake profile and meet adopters</div>
        </button>
        <button
          onClick={() => onPickMode('adopter')}
          className="w-65 rounded-lg border-2 border-sage bg-sage-100 p-6 text-left transition-colors hover:bg-sage-200"
        >
          <div className="mb-3.5 h-10 w-10 rounded-full bg-sage" />
          <div className="mb-1.5 font-heading text-xl text-sage-800">I'm an Adopter</div>
          <div className="text-sm text-ink/75">Create an application and meet dogs</div>
        </button>
      </div>

      {activeProfile && (
        <button onClick={onContinue} className="mt-7 text-sm text-clay-700 underline underline-offset-4">
          Continue as {profileName}
        </button>
      )}
    </div>
  );
}

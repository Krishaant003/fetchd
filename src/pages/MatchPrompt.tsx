import { respondToMatch } from '../lib/api/matches';
import type { MatchDecision } from '../lib/api/matches';

interface MatchPromptProps {
  matchId: string;
  onResolved: () => void;
}

export function MatchPrompt({ matchId, onResolved }: MatchPromptProps) {
  async function respond(decision: MatchDecision) {
    await respondToMatch(matchId, decision);
    onResolved();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60">
      <div className="w-72 rotate-[-2deg] border-4 border-double border-amber-900 bg-amber-50 p-6 text-center font-mono shadow-2xl">
        <p className="mb-4 text-lg font-bold uppercase text-amber-950">It's a match!</p>
        <p className="mb-4 text-sm text-amber-900">Someone already said yes to you. Accept to lock it in.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => respond('rejected')} className="rounded border-2 border-red-700 px-4 py-2 text-red-700">
            Not now
          </button>
          <button onClick={() => respond('accepted')} className="rounded border-2 border-green-700 px-4 py-2 text-green-700">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

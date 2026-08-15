import { respondToMatch } from '../lib/api/matches';
import type { MatchDecision } from '../lib/api/matches';

interface MatchPromptProps {
  matchId: string;
  otherName: string;
  onResolved: () => void;
}

export function MatchPrompt({ matchId, otherName, onResolved }: MatchPromptProps) {
  async function respond(decision: MatchDecision) {
    await respondToMatch(matchId, decision);
    onResolved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-900/55 p-6">
      <div className="w-full max-w-110 rounded-[calc(var(--radius-lg)*1.2)] bg-surface px-8 py-9 text-center shadow-lg">
        <div
          className="mx-auto mb-4.5 flex h-30 w-30 rotate-[-7deg] items-center justify-center rounded-full border-[5px] border-double border-clay"
          style={{ animation: 'stamp-in 0.45s ease' }}
        >
          <div className="font-heading text-[15px] leading-tight tracking-wide text-clay-700">
            IT'S
            <br />
            MUTUAL
          </div>
        </div>
        <h2 className="mb-1.5 font-heading text-xl">You and {otherName} both said yes</h2>
        <p className="mb-6 text-[13.5px] text-ink/75">
          Confirm to add this to Matches for both of you  reject and it won't come up again.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => respond('rejected')}
            className="flex-1 rounded-full border-[1.5px] border-divider py-3 font-heading text-sm hover:bg-ink/7"
          >
            Not this time
          </button>
          <button
            onClick={() => respond('accepted')}
            className="flex-1 rounded-full bg-clay py-3 font-heading text-sm text-cream hover:bg-clay-600"
          >
            Confirm match
          </button>
        </div>
      </div>
    </div>
  );
}

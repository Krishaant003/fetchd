import { supabase } from '../../supabaseClient';
import type { Adopter, Dog, Match, MatchStatus, ProfileType } from '../../types';

export type MatchDecision = Extract<MatchStatus, 'accepted' | 'rejected'>;

export async function respondToMatch(matchId: string, decision: MatchDecision): Promise<void> {
  const { error } = await supabase.from('matches').update({ status: decision }).eq('id', matchId);
  if (error) throw error;
}

export interface AcceptedMatch {
  match: Match;
  dog: Dog;
  adopter: Adopter;
}

export async function fetchAcceptedMatches(viewerType: ProfileType, viewerId: string): Promise<AcceptedMatch[]> {
  const column = viewerType === 'adopter' ? 'adopter_id' : 'dog_id';
  const { data, error } = await supabase
    .from('matches')
    .select('*, dog:dogs(*), adopter:adopters(*)')
    .eq(column, viewerId)
    .eq('status', 'accepted');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    match: {
      id: row.id,
      adopter_id: row.adopter_id,
      dog_id: row.dog_id,
      status: row.status,
      created_at: row.created_at,
    },
    dog: row.dog,
    adopter: row.adopter,
  }));
}

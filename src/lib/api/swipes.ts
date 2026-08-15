import { supabase } from '../../supabaseClient';
import type { Adopter, Dog, ProfileType } from '../../types';

export async function fetchDeck(viewerType: ProfileType, viewerId: string): Promise<(Dog | Adopter)[]> {
  const targetType: ProfileType = viewerType === 'dog' ? 'adopter' : 'dog';
  const targetTable = targetType === 'dog' ? 'dogs' : 'adopters';

  const { data: swiped, error: swipedError } = await supabase
    .from('swipes')
    .select('target_id')
    .eq('swiper_id', viewerId)
    .eq('swiper_type', viewerType);
  if (swipedError) throw swipedError;
  const swipedIds = (swiped ?? []).map((s: { target_id: string }) => s.target_id);

  let query = supabase.from(targetTable).select('*');
  if (swipedIds.length > 0) {
    query = query.not('id', 'in', `(${swipedIds.join(',')})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as (Dog | Adopter)[];
}

export interface RecordSwipeResult {
  matchId: string | null;
}

export async function recordSwipe(
  swiperType: ProfileType,
  swiperId: string,
  targetType: ProfileType,
  targetId: string,
  direction: 'right' | 'left'
): Promise<RecordSwipeResult> {
  const { error: swipeError } = await supabase.from('swipes').insert({
    swiper_id: swiperId,
    swiper_type: swiperType,
    target_id: targetId,
    target_type: targetType,
    direction,
  });
  if (swipeError) throw swipeError;

  if (direction === 'left') return { matchId: null };

  const { data: reciprocal, error: reciprocalError } = await supabase
    .from('swipes')
    .select('id')
    .eq('swiper_id', targetId)
    .eq('swiper_type', targetType)
    .eq('target_id', swiperId)
    .eq('target_type', swiperType)
    .eq('direction', 'right')
    .maybeSingle();
  if (reciprocalError) throw reciprocalError;
  if (!reciprocal) return { matchId: null };

  const adopterId = swiperType === 'adopter' ? swiperId : targetId;
  const dogId = swiperType === 'dog' ? swiperId : targetId;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({ adopter_id: adopterId, dog_id: dogId, status: 'pending' })
    .select()
    .single();
  if (matchError) throw matchError;
  return { matchId: match.id };
}

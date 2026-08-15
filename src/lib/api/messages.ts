import { supabase } from '../../supabaseClient';
import type { Message, ProfileType } from '../../types';

export async function fetchMessages(matchId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(
  matchId: string,
  senderType: ProfileType,
  senderId: string,
  body: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_type: senderType, sender_id: senderId, body })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

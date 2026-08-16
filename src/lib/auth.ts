import { supabase } from '../supabaseClient';

const EMAIL_DOMAIN = '@fetchd.local';
const TAKEN_ERROR = 'That username is taken — try another.';
const LOGIN_ERROR = 'Incorrect username or password.';

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}${EMAIL_DOMAIN}`;
}

export async function signUp(username: string, password: string): Promise<void> {
  const normalized = normalizeUsername(username);
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(normalized),
    password,
    options: { data: { username: normalized } },
  });
  if (error) {
    if (/already registered/i.test(error.message)) throw new Error(TAKEN_ERROR);
    throw error;
  }
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error(TAKEN_ERROR);
  }
}

export async function logIn(username: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) throw new Error(LOGIN_ERROR);
}

export async function logOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function getCurrentUsername(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return (data.session?.user.user_metadata.username as string | undefined) ?? null;
}

export function onAuthStateChange(callback: (userId: string | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}

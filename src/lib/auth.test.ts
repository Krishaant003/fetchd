import { describe, it, expect, vi, beforeEach } from 'vitest';

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  supabase: { auth: authMocks },
}));

import {
  normalizeUsername,
  signUp,
  logIn,
  logOut,
  getCurrentUserId,
  getCurrentUsername,
  onAuthStateChange,
} from './auth';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('normalizeUsername', () => {
  it('lowercases and strips whitespace', () => {
    expect(normalizeUsername('  Jane Doe ')).toBe('janedoe');
  });
});

describe('signUp', () => {
  it('signs up with a normalized fake email and the username in metadata', async () => {
    authMocks.signUp.mockResolvedValue({ data: { user: { identities: [{ id: 'x' }] } }, error: null });
    await signUp('Jane Doe', 'pw12345');
    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'janedoe@fetchd.local',
      password: 'pw12345',
      options: { data: { username: 'janedoe' } },
    });
  });

  it('throws a friendly error when Supabase reports the email is already registered', async () => {
    authMocks.signUp.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } });
    await expect(signUp('jane', 'pw12345')).rejects.toThrow('That username taken — try another.');
  });

  it('throws a friendly error when signup succeeds but returns no identities (silent duplicate)', async () => {
    authMocks.signUp.mockResolvedValue({ data: { user: { identities: [] } }, error: null });
    await expect(signUp('jane', 'pw12345')).rejects.toThrow('That username taken — try another.');
  });
});

describe('logIn', () => {
  it('signs in with the reconstructed fake email', async () => {
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    await logIn('Jane Doe', 'pw12345');
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'janedoe@fetchd.local',
      password: 'pw12345',
    });
  });

  it('throws a friendly error on failure', async () => {
    authMocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    await expect(logIn('jane', 'wrong')).rejects.toThrow('Incorrect username or password.');
  });
});

describe('logOut', () => {
  it('calls supabase signOut', async () => {
    authMocks.signOut.mockResolvedValue({ error: null });
    await logOut();
    expect(authMocks.signOut).toHaveBeenCalled();
  });
});

describe('getCurrentUserId', () => {
  it('returns the session user id, or null if signed out', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', user_metadata: {} } } } });
    expect(await getCurrentUserId()).toBe('u1');

    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    expect(await getCurrentUserId()).toBeNull();
  });
});

describe('getCurrentUsername', () => {
  it('returns the metadata username, or null if signed out', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', user_metadata: { username: 'jane' } } } },
    });
    expect(await getCurrentUsername()).toBe('jane');

    authMocks.getSession.mockResolvedValue({ data: { session: null } });
    expect(await getCurrentUsername()).toBeNull();
  });
});

describe('onAuthStateChange', () => {
  it('invokes the callback with the session user id and returns an unsubscribe function', () => {
    const unsubscribe = vi.fn();
    authMocks.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      cb('SIGNED_IN', { user: { id: 'u1' } });
      return { data: { subscription: { unsubscribe } } };
    });

    const callback = vi.fn();
    const teardown = onAuthStateChange(callback);
    expect(callback).toHaveBeenCalledWith('u1');

    teardown();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { getOrCreateSessionId, getActiveProfile, setActiveProfile } from './session';

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and persists a session id on first call', () => {
    const id = getOrCreateSessionId();
    expect(id).toBeTruthy();
    expect(getOrCreateSessionId()).toBe(id);
  });

  it('returns null when no active profile is stored', () => {
    expect(getActiveProfile()).toBeNull();
  });

  it('stores and retrieves the active profile', () => {
    setActiveProfile({ type: 'dog', id: 'abc-123' });
    expect(getActiveProfile()).toEqual({ type: 'dog', id: 'abc-123' });
  });
});

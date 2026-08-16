import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveProfile, setActiveProfile, clearActiveProfile } from './session';

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no active profile is stored', () => {
    expect(getActiveProfile()).toBeNull();
  });

  it('stores and retrieves the active profile', () => {
    setActiveProfile({ type: 'dog', id: 'abc-123' });
    expect(getActiveProfile()).toEqual({ type: 'dog', id: 'abc-123' });
  });

  it('removes the active profile', () => {
    setActiveProfile({ type: 'dog', id: 'abc-123' });
    clearActiveProfile();
    expect(getActiveProfile()).toBeNull();
  });
});

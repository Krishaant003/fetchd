import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { logIn } from '../lib/auth';
import { Logo } from '../components/Logo';

interface LoginProps {
  onLoggedIn: () => void;
}

export function Login({ onLoggedIn }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await logIn(username, password);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center sm:px-10">
      <Logo variant="stacked" />
      <form onSubmit={handleSubmit} className="mt-8 flex w-full max-w-90 flex-col gap-4 text-left">
        <div>
          <label className="mb-1.5 block text-xs text-ink/70">Username</label>
          <input
            aria-label="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full min-h-10 rounded-full border border-divider bg-surface px-3.5 py-2 text-sm outline-none focus:border-clay"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-ink/70">Password</label>
          <input
            aria-label="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-10 rounded-full border border-divider bg-surface px-3.5 py-2 text-sm outline-none focus:border-clay"
          />
        </div>
        {error && <p className="text-xs text-clay-700">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-clay px-7 py-3 font-heading text-[15px] text-cream transition-colors hover:bg-clay-600 disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <Link to="/signup" className="mt-6 text-sm text-clay-700 underline underline-offset-4">
        Need an account? Sign up
      </Link>
    </div>
  );
}

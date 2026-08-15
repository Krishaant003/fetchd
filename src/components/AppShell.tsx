import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import type { ActiveProfile } from '../lib/session';

interface AppShellProps {
  activeProfile: ActiveProfile | null;
  profileName: string;
  matchCount: number;
}

const CANVAS_BACKGROUND = {
  backgroundImage: 'radial-gradient(rgba(32,30,29,0.10) 1.6px, transparent 1.6px)',
  backgroundSize: '22px 22px',
};

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center rounded-full px-3.5 py-2.5 text-left text-sm transition-colors ${
    isActive ? 'bg-clay text-cream' : 'text-ink hover:bg-ink/8'
  }`;
}

export function AppShell({ activeProfile, profileName, matchCount }: AppShellProps) {
  if (!activeProfile) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-59 shrink-0 flex-col gap-1.5 border-r border-divider bg-surface px-5 py-7">
        <div className="mb-7">
          <Logo variant="row" />
        </div>
        <NavLink to="/discover" className={navLinkClass}>
          Discover
        </NavLink>
        <NavLink to="/matches" className={navLinkClass}>
          My Matches
          {matchCount > 0 && (
            <span className="ml-2 rounded-full bg-clay px-2 py-px text-[11px] text-cream">{matchCount}</span>
          )}
        </NavLink>
        <NavLink to="/liked" className={navLinkClass}>
          Liked
        </NavLink>
        <NavLink to="/profile/edit" className={navLinkClass}>
          Edit Profile
        </NavLink>
        <div className="mt-auto border-t border-divider pt-4.5 text-xs text-ink/55">
          Signed in as
          <br />
          <strong className="text-ink">{profileName}</strong> · {activeProfile.type === 'dog' ? 'Dog' : 'Adopter'}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto" style={CANVAS_BACKGROUND}>
        <Outlet />
      </main>
    </div>
  );
}

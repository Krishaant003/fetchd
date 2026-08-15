import { useEffect, useState } from 'react';
import type { Adopter, Dog, ProfileType } from './types';
import { combineAnswers } from './types';
import { getOrCreateSessionId, getActiveProfile, setActiveProfile } from './lib/session';
import type { ActiveProfile } from './lib/session';
import { fetchProfile } from './lib/api/profiles';
import { fetchAcceptedMatches } from './lib/api/matches';
import type { AcceptedMatch } from './lib/api/matches';
import { Landing } from './pages/Landing';
import { CreateProfile } from './pages/CreateProfile';
import { SwipeDeck } from './pages/SwipeDeck';
import { MatchPrompt } from './pages/MatchPrompt';
import { MatchedSection } from './pages/MatchedSection';
import { Chat } from './pages/Chat';
import { Liked } from './pages/Liked';

type View = 'landing' | 'create' | 'edit' | 'deck' | 'matched' | 'chat' | 'liked';

interface PendingMatch {
  id: string;
  otherName: string;
}

const CANVAS_BACKGROUND = {
  backgroundImage: 'radial-gradient(rgba(32,30,29,0.10) 1.6px, transparent 1.6px)',
  backgroundSize: '22px 22px',
};

export default function App() {
  const [sessionId] = useState(getOrCreateSessionId);
  const [activeProfile, setActiveProfileState] = useState<ActiveProfile | null>(getActiveProfile);
  const [profileName, setProfileName] = useState('');
  const [viewerText, setViewerText] = useState('');
  const [pendingType, setPendingType] = useState<ProfileType>('dog');
  const [view, setView] = useState<View>('landing');
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [editingProfile, setEditingProfile] = useState<Dog | Adopter | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<AcceptedMatch | null>(null);

  useEffect(() => {
    if (!activeProfile) return;
    fetchProfile(activeProfile.type, activeProfile.id).then((profile) => {
      setProfileName(profile.name);
      setViewerText(combineAnswers(profile));
    });
    refreshMatchCount();
  }, [activeProfile]);

  function refreshMatchCount() {
    if (!activeProfile) return;
    fetchAcceptedMatches(activeProfile.type, activeProfile.id).then((matches) => setMatchCount(matches.length));
  }

  function handlePickMode(type: ProfileType) {
    setPendingType(type);
    setView('create');
  }

  function handleCreated(profile: ActiveProfile, text: string) {
    setActiveProfile(profile);
    setActiveProfileState(profile);
    setViewerText(text);
    setView('deck');
  }

  async function handleEditProfile() {
    if (!activeProfile) return;
    const profile = await fetchProfile(activeProfile.type, activeProfile.id);
    setEditingProfile(profile);
    setView('edit');
  }

  function handleMatchResolved() {
    setPendingMatch(null);
    refreshMatchCount();
  }

  function handleOpenMatch(match: AcceptedMatch) {
    setSelectedMatch(match);
    setView('chat');
  }

  function handleMatchClosed() {
    setSelectedMatch(null);
    setView('matched');
    refreshMatchCount();
  }

  function navButtonClass(isActive: boolean) {
    return `flex items-center rounded-full px-3.5 py-2.5 text-left text-sm transition-colors ${
      isActive ? 'bg-clay text-cream' : 'text-ink hover:bg-ink/8'
    }`;
  }

  const isEnteredApp = activeProfile !== null && view !== 'landing';

  return (
    <div className="flex min-h-screen">
      {isEnteredApp && (
        <aside className="flex w-59 shrink-0 flex-col gap-1.5 border-r border-divider bg-surface px-5 py-7">
          <div className="mb-7 flex items-center gap-2.5">
            <div className="relative h-8.5 w-8.5">
              <div className="absolute bottom-0 right-0 h-5.5 w-5.5 rounded-full bg-clay" />
              <div className="absolute left-0.5 top-0 h-2.25 w-2.25 rounded-full bg-sage" />
              <div className="absolute left-4 top-0.5 h-2.25 w-2.25 rounded-full bg-sage" />
            </div>
            <div className="font-heading text-lg">Fetch Match</div>
          </div>
          <button className={navButtonClass(view === 'deck')} onClick={() => setView('deck')}>
            Discover
          </button>
          <button className={navButtonClass(view === 'matched' || view === 'chat')} onClick={() => setView('matched')}>
            My Matches
            {matchCount > 0 && (
              <span className="ml-2 rounded-full bg-clay px-2 py-px text-[11px] text-cream">{matchCount}</span>
            )}
          </button>
          <button className={navButtonClass(view === 'liked')} onClick={() => setView('liked')}>
            Liked
          </button>
          <button className={navButtonClass(view === 'edit')} onClick={handleEditProfile}>
            Edit Profile
          </button>
          <div className="mt-auto border-t border-divider pt-4.5 text-xs text-ink/55">
            Signed in as
            <br />
            <strong className="text-ink">{profileName}</strong> · {activeProfile.type === 'dog' ? 'Dog' : 'Adopter'}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto" style={CANVAS_BACKGROUND}>
        {view === 'landing' && (
          <Landing
            activeProfile={activeProfile}
            profileName={profileName}
            onPickMode={handlePickMode}
            onContinue={() => setView('deck')}
          />
        )}
        {view === 'create' && (
          <CreateProfile sessionId={sessionId} profileType={pendingType} onCreated={handleCreated} />
        )}
        {view === 'edit' && activeProfile && editingProfile && (
          <CreateProfile
            sessionId={sessionId}
            profileType={activeProfile.type}
            existingProfile={editingProfile}
            onCreated={handleCreated}
          />
        )}
        {view === 'deck' && activeProfile && (
          <SwipeDeck
            activeProfile={activeProfile}
            viewerText={viewerText}
            onMatch={(id, otherName) => setPendingMatch({ id, otherName })}
          />
        )}
        {view === 'matched' && activeProfile && (
          <MatchedSection activeProfile={activeProfile} onOpenMatch={handleOpenMatch} />
        )}
        {view === 'chat' && activeProfile && selectedMatch && (
          <Chat
            match={selectedMatch}
            viewerProfile={activeProfile}
            onBack={() => setView('matched')}
            onMatchClosed={handleMatchClosed}
          />
        )}
        {view === 'liked' && activeProfile && <Liked activeProfile={activeProfile} />}
      </main>

      {pendingMatch && (
        <MatchPrompt matchId={pendingMatch.id} otherName={pendingMatch.otherName} onResolved={handleMatchResolved} />
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { ProfileType } from './types';
import { combineAnswers } from './types';
import { getOrCreateSessionId, getActiveProfile, setActiveProfile } from './lib/session';
import type { ActiveProfile } from './lib/session';
import { fetchProfile } from './lib/api/profiles';
import { fetchAcceptedMatches } from './lib/api/matches';
import { Landing } from './pages/Landing';
import { CreateProfile } from './pages/CreateProfile';
import { SwipeDeck } from './pages/SwipeDeck';
import { MatchPrompt } from './pages/MatchPrompt';
import { MatchedSection } from './pages/MatchedSection';
import { Liked } from './pages/Liked';
import { ChatRoute } from './pages/ChatRoute';
import { EditProfileRoute } from './pages/EditProfileRoute';
import { AppShell } from './components/AppShell';

interface PendingMatch {
  id: string;
  otherName: string;
}

interface JoinRouteProps {
  sessionId: string;
  onCreated: (profile: ActiveProfile, viewerText: string) => void;
}

function JoinRoute({ sessionId, onCreated }: JoinRouteProps) {
  const { type } = useParams();
  if (type !== 'dog' && type !== 'adopter') return <Navigate to="/" replace />;
  return <CreateProfile sessionId={sessionId} profileType={type} onCreated={onCreated} />;
}

function AppRoutes() {
  const navigate = useNavigate();
  const [sessionId] = useState(getOrCreateSessionId);
  const [activeProfile, setActiveProfileState] = useState<ActiveProfile | null>(getActiveProfile);
  const [profileName, setProfileName] = useState('');
  const [viewerText, setViewerText] = useState('');
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [matchCount, setMatchCount] = useState(0);

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
    navigate(`/join/${type}`);
  }

  function handleCreated(profile: ActiveProfile, text: string) {
    setActiveProfile(profile);
    setActiveProfileState(profile);
    setViewerText(text);
    navigate('/discover');
  }

  function handleMatchResolved() {
    setPendingMatch(null);
    refreshMatchCount();
  }

  function handleMatchClosed() {
    navigate('/matches');
    refreshMatchCount();
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Landing
              activeProfile={activeProfile}
              profileName={profileName}
              onPickMode={handlePickMode}
              onContinue={() => navigate('/discover')}
            />
          }
        />
        <Route path="/join/:type" element={<JoinRoute sessionId={sessionId} onCreated={handleCreated} />} />

        <Route element={<AppShell activeProfile={activeProfile} profileName={profileName} matchCount={matchCount} />}>
          <Route
            path="/discover"
            element={
              activeProfile && (
                <SwipeDeck
                  activeProfile={activeProfile}
                  viewerText={viewerText}
                  onMatch={(id, otherName) => setPendingMatch({ id, otherName })}
                />
              )
            }
          />
          <Route
            path="/matches"
            element={
              activeProfile && (
                <MatchedSection
                  activeProfile={activeProfile}
                  onOpenMatch={(match) => navigate(`/matches/${match.match.id}`)}
                />
              )
            }
          />
          <Route
            path="/matches/:matchId"
            element={activeProfile && <ChatRoute activeProfile={activeProfile} onMatchClosed={handleMatchClosed} />}
          />
          <Route path="/liked" element={activeProfile && <Liked activeProfile={activeProfile} />} />
          <Route
            path="/profile/edit"
            element={
              activeProfile && (
                <EditProfileRoute sessionId={sessionId} activeProfile={activeProfile} onCreated={handleCreated} />
              )
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {pendingMatch && (
        <MatchPrompt matchId={pendingMatch.id} otherName={pendingMatch.otherName} onResolved={handleMatchResolved} />
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

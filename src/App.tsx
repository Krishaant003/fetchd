import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { ProfileType } from './types';
import { combineAnswers } from './types';
import { getActiveProfile, setActiveProfile, clearActiveProfile } from './lib/session';
import type { ActiveProfile } from './lib/session';
import { getCurrentUserId, onAuthStateChange, logOut } from './lib/auth';
import { fetchProfile, fetchOwnedProfiles } from './lib/api/profiles';
import { fetchAcceptedMatches } from './lib/api/matches';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';
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
  userId: string;
  onCreated: (profile: ActiveProfile, viewerText: string) => void;
}

function JoinRoute({ userId, onCreated }: JoinRouteProps) {
  const { type } = useParams();
  if (type !== 'dog' && type !== 'adopter') return <Navigate to="/" replace />;
  return <CreateProfile userId={userId} profileType={type} onCreated={onCreated} />;
}

function RequireAuth({ userId }: { userId: string | null }) {
  if (!userId) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AppRoutes() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeProfile, setActiveProfileState] = useState<ActiveProfile | null>(getActiveProfile);
  const [profileName, setProfileName] = useState('');
  const [viewerText, setViewerText] = useState('');
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    getCurrentUserId().then((id) => {
      setUserId(id);
      setAuthLoading(false);
    });
    return onAuthStateChange((id) => setUserId(id));
  }, []);

  useEffect(() => {
    if (!activeProfile || !userId) return;
    fetchProfile(activeProfile.type, activeProfile.id)
      .then((profile) => {
        setProfileName(profile.name);
        setViewerText(combineAnswers(profile));
      })
      .catch(() => {});
    refreshMatchCount();
  }, [activeProfile, userId]);

  function refreshMatchCount() {
    if (!activeProfile) return;
    fetchAcceptedMatches(activeProfile.type, activeProfile.id)
      .then((matches) => setMatchCount(matches.length))
      .catch(() => {});
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

  async function handleLoggedIn() {
    const id = await getCurrentUserId();
    if (!id) return;
    clearActiveProfile();
    setActiveProfileState(null);
    const owned = await fetchOwnedProfiles(id);
    if (owned.length === 1) {
      setActiveProfile(owned[0]);
      setActiveProfileState(owned[0]);
      navigate('/discover');
    } else {
      navigate('/');
    }
  }

  function handleSignedUp() {
    clearActiveProfile();
    setActiveProfileState(null);
    navigate('/');
  }

  async function handleLogout() {
    await logOut();
    clearActiveProfile();
    setActiveProfileState(null);
    navigate('/login');
  }

  function handleMatchResolved() {
    setPendingMatch(null);
    refreshMatchCount();
  }

  function handleMatchClosed() {
    navigate('/matches');
    refreshMatchCount();
  }

  if (authLoading) return null;

  return (
    <>
      <Routes>
        <Route path="/signup" element={userId ? <Navigate to="/" replace /> : <Signup onSignedUp={handleSignedUp} />} />
        <Route path="/login" element={userId ? <Navigate to="/" replace /> : <Login onLoggedIn={handleLoggedIn} />} />

        <Route element={<RequireAuth userId={userId} />}>
          <Route
            path="/"
            element={
              <Landing
                activeProfile={activeProfile}
                profileName={profileName}
                onPickMode={handlePickMode}
                onContinue={() => navigate('/discover')}
                onLogout={handleLogout}
              />
            }
          />
          <Route path="/join/:type" element={userId && <JoinRoute userId={userId} onCreated={handleCreated} />} />

          <Route
            element={
              <AppShell
                activeProfile={activeProfile}
                profileName={profileName}
                matchCount={matchCount}
                onLogout={handleLogout}
              />
            }
          >
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
                activeProfile && userId && (
                  <EditProfileRoute userId={userId} activeProfile={activeProfile} onCreated={handleCreated} />
                )
              }
            />
          </Route>
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

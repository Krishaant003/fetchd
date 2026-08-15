import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chat } from './Chat';
import { fetchAcceptedMatches } from '../lib/api/matches';
import type { AcceptedMatch } from '../lib/api/matches';
import type { ActiveProfile } from '../lib/session';

interface ChatRouteProps {
  activeProfile: ActiveProfile;
  onMatchClosed: () => void;
}

export function ChatRoute({ activeProfile, onMatchClosed }: ChatRouteProps) {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<AcceptedMatch | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchAcceptedMatches(activeProfile.type, activeProfile.id).then((matches) => {
      const found = matches.find((m) => m.match.id === matchId);
      if (found) setMatch(found);
      else setNotFound(true);
    });
  }, [activeProfile, matchId]);

  useEffect(() => {
    if (notFound) navigate('/matches', { replace: true });
  }, [notFound, navigate]);

  if (!match) return null;

  return (
    <Chat match={match} viewerProfile={activeProfile} onBack={() => navigate('/matches')} onMatchClosed={onMatchClosed} />
  );
}

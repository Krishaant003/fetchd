import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ActiveProfile } from '../lib/session';
import type { AcceptedMatch } from '../lib/api/matches';
import { markAdopted, unmatchMatch } from '../lib/api/matches';
import { fetchMessages, sendMessage } from '../lib/api/messages';
import type { Message } from '../types';

interface ChatProps {
  match: AcceptedMatch;
  viewerProfile: ActiveProfile;
  onBack: () => void;
  onMatchClosed: () => void;
}

const POLL_INTERVAL_MS = 3000;

function formatMatchedOn(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Chat({ match, viewerProfile, onBack, onMatchClosed }: ChatProps) {
  const other = viewerProfile.type === 'dog' ? match.adopter : match.dog;
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetchMessages(match.match.id).then((next) => {
        if (!cancelled) setMessages(next);
      });
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [match.match.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    const sent = await sendMessage(match.match.id, viewerProfile.type, viewerProfile.id, body);
    setMessages((prev) => [...prev, sent]);
  }

  async function handleUnmatch() {
    await unmatchMatch(match.match.id);
    onMatchClosed();
  }

  async function handleMarkAdopted() {
    await markAdopted(match.match.id);
    onMatchClosed();
  }

  return (
    <div className="mx-auto max-w-3xl px-10 py-11">
      <button onClick={onBack} className="mb-5 text-sm text-clay-700">
        ← Back to matches
      </button>

      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={other.photo_urls[0]} alt="" className="h-11 w-11 rounded-full object-cover" />
          <div>
            <div className="font-heading text-xl">{other.name}</div>
            <div className="text-xs text-ink/60">Matched {formatMatchedOn(match.match.created_at)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleUnmatch} className="rounded-full border-[1.5px] border-divider px-4 py-2 text-sm hover:bg-ink/7">
            Unmatch
          </button>
          <button onClick={handleMarkAdopted} className="rounded-full bg-sage px-4 py-2 text-sm text-cream hover:bg-sage-600">
            Mark adopted
          </button>
        </div>
      </div>

      <div className="flex max-h-125 min-h-100 flex-col gap-2.5 overflow-y-auto rounded-3xl bg-surface p-5">
        {messages.map((message) => {
          const isMine = message.sender_type === viewerProfile.type && message.sender_id === viewerProfile.id;
          return (
            <div
              key={message.id}
              className={`max-w-[70%] rounded-full px-4 py-2 text-sm ${
                isMine ? 'self-end bg-clay text-cream' : 'self-start bg-surface-2'
              }`}
            >
              {message.body}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2.5">
        <input
          aria-label="message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="min-h-11 flex-1 rounded-full border border-divider bg-surface px-4 py-2.5 text-sm outline-none focus:border-clay"
        />
        <button type="submit" className="rounded-full bg-clay px-6 py-2.5 font-heading text-sm text-cream hover:bg-clay-600">
          Send
        </button>
      </form>
    </div>
  );
}

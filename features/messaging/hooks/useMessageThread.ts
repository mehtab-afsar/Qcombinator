"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/features/messaging/types';

/**
 * Fetch + Realtime-subscribe + send for one connection's thread — the
 * already-correct logic that was duplicated between the founder and investor
 * pages, de-duplicated here unchanged (not a redesign of the Realtime pattern).
 */
export function useMessageThread(connectionId: string | null, active: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput('');
    if (!connectionId || !active) { setMessages([]); return; }

    setLoading(true);
    fetch(`/api/messages?connectionId=${connectionId}`)
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => setMessages(d.messages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    let supabase: ReturnType<typeof createClient>;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']>;
    try {
      supabase = createClient();
      channel = supabase
        .channel(`messages:${connectionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_request_id=eq.${connectionId}` },
          (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        )
        .subscribe();
    } catch { /* Realtime unavailable — graceful degradation */ }

    return () => {
      try { if (channel) supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [connectionId, active]);

  async function send(): Promise<ChatMessage | null> {
    if (!connectionId || !input.trim() || sending) return null;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, body: input.trim() }),
      });
      if (!res.ok) { setError('Failed to send — please try again'); return null; }
      const d = await res.json();
      setMessages(prev => [...prev, d.message]);
      setInput('');
      return d.message as ChatMessage;
    } catch {
      setError('Failed to send — please try again');
      return null;
    } finally {
      setSending(false);
    }
  }

  return { messages, loading, input, setInput, sending, send, error };
}

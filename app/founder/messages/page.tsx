'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { MessageGroupBlock, buildGroups } from '@/features/shared/components/MessageBubble';
import { bg, surf, bdr, ink, muted, blue, green, amber } from '@/lib/constants/colors'

// ─── agent colors ─────────────────────────────────────────────────────────────
const AGENT_COLORS: Record<string, string> = {
  patel:  '#2563EB',
  susi:   '#16A34A',
  maya:   '#9333EA',
  felix:  '#D97706',
  leo:    '#DC2626',
  harper: '#0891B2',
  nova:   '#DB2777',
  atlas:  '#059669',
  sage:   '#7C3AED',
  system: '#8A867C',
};

function agentColor(id: string): string {
  return AGENT_COLORS[id] ?? muted;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

function relDate(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── types ────────────────────────────────────────────────────────────────────
interface AgentActivity {
  id: string;
  agent_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

interface Connection {
  id: string;
  demo_investor_id: string | null;
  investor_id: string | null;
  personal_message: string;
  status: string;
  created_at: string;
  investor_name?: string;
  investor_firm?: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ─── status chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const normalised = status === 'meeting_scheduled' ? 'accepted' : status;
  const map: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#FFFBEB', color: amber },
    viewed:   { bg: '#EFF6FF', color: blue  },
    accepted: { bg: '#F0FDF4', color: green },
    declined: { bg: '#FEF2F2', color: '#DC2626' },
  };
  const s = map[normalised] ?? map.pending;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      padding: '2px 8px', borderRadius: 999,
      background: s.bg, color: s.color,
      textTransform: 'capitalize',
      border: `1px solid ${s.color}22`,
    }}>
      {normalised}
    </span>
  );
}

// ─── thread panel (right side of split layout) ───────────────────────────────
function ThreadPanel({
  conn,
  myUserId,
}: {
  conn: Connection;
  myUserId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canMessage = conn.status === 'meeting_scheduled' || conn.status === 'accepted';
  const investorInitials = (conn.investor_name ?? 'IN')
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    if (!canMessage) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/messages?connectionId=${conn.id}`)
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => setMessages(d.messages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Realtime — live incoming messages
    let supabase: ReturnType<typeof createClient>;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']>;
    try {
      supabase = createClient();
      channel = supabase
        .channel(`founder_messages:${conn.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_id=eq.${conn.id}` },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        )
        .subscribe();
    } catch { /* Realtime unavailable — graceful degradation */ }

    return () => {
      try { if (channel!) supabase!.removeChannel(channel!); } catch { /* ignore */ }
    };
  }, [conn.id, canMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3000);
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id, body: input.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages(prev => [...prev, d.message]);
        setInput('');
      } else { showToast('Failed to send — please try again'); }
    } catch { showToast('Failed to send — please try again'); }
    finally { setSending(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: ink, color: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>
          {investorInitials}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: 0 }}>{conn.investor_name ?? 'Investor'}</p>
          {conn.investor_firm && <p style={{ fontSize: 11, color: muted, margin: 0 }}>{conn.investor_firm}</p>}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusChip status={conn.status} />
        </div>
      </div>

      {/* Thread area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Pending state */}
        {!canMessage && (
          <div>
            <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: muted, background: surf, padding: '4px 14px', borderRadius: 999, border: `1px solid ${bdr}` }}>
                Request sent · {relDate(conn.created_at)} · Awaiting response
              </span>
            </div>
            {conn.personal_message && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 16 }}>
                <div style={{ maxWidth: '72%' }}>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 3, textAlign: 'right' }}>Your message</p>
                  <div style={{ background: ink, color: bg, borderRadius: '12px 4px 12px 12px', padding: '10px 14px' }}>
                    <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{conn.personal_message}</p>
                  </div>
                </div>
              </div>
            )}
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 12, color: muted }}>You&apos;ll be able to message once they accept your request.</p>
            </div>
          </div>
        )}

        {/* Accepted thread */}
        {canMessage && (
          <div>
            <div style={{ textAlign: 'center', padding: '8px 0', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: muted, background: surf, padding: '4px 14px', borderRadius: 999, border: `1px solid ${bdr}` }}>
                Connected · {relDate(conn.created_at)}
              </span>
            </div>
            {conn.personal_message && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: ink }}>{investorInitials}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: muted, marginBottom: 3 }}>{conn.investor_name ?? 'Investor'} · Connection request</p>
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: '4px 12px 12px 12px', padding: '8px 12px' }}>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, margin: 0 }}>{conn.personal_message}</p>
                  </div>
                </div>
              </div>
            )}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 12, color: muted }}>Loading messages…</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.length === 0 && !conn.personal_message && (
                  <p style={{ fontSize: 12, color: muted, textAlign: 'center', padding: '16px 0' }}>No messages yet. Be the first to say hello.</p>
                )}
                {buildGroups(messages, myUserId ?? '').map((group, gi) => (
                  <MessageGroupBlock
                    key={group.messages[0].id}
                    group={group}
                    senderInitials={investorInitials}
                    myInitials="Me"
                    isFirst={gi === 0}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compose (only for accepted) */}
      {canMessage && (
        <div style={{ borderTop: `1px solid ${bdr}`, padding: '12px 16px', flexShrink: 0, background: bg }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 10,
            background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '10px 14px',
          }}>
            <textarea
              value={input}
              onChange={e => {
                setInput(e.target.value)
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 140) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message ${conn.investor_name ?? 'investor'}…`}
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
                background: 'transparent', fontSize: 13, color: ink,
                fontFamily: 'inherit', lineHeight: 1.6, maxHeight: 140,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {input.length > 3500 && (
                <span style={{ fontSize: 10, color: input.length > 4000 ? '#DC2626' : muted }}>{input.length}/4000</span>
              )}
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || input.length > 4000}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: input.trim() && !sending ? ink : bdr,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() && !sending ? 'pointer' : 'default',
                  transition: 'background .12s',
                }}
              >
                <Send style={{ height: 13, width: 13, color: input.trim() ? bg : muted }} />
              </button>
            </div>
          </div>
          <p style={{ fontSize: 10, color: muted, marginTop: 5, paddingLeft: 2 }}>⌘+Enter to send</p>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: ink, color: bg, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── main inner ───────────────────────────────────────────────────────────────
function MessagesInner() {
  const { user } = useAuth();

  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [connections,   setConnections]   = useState<Connection[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [myUserId,      setMyUserId]      = useState<string | null>(null);
  const [selectedConn,  setSelectedConn]  = useState<Connection | null>(null);

  useEffect(() => {
    if (!user) return;
    setMyUserId(user.id);
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const client = createClient();
        const { data: activityData } = await client
          .from('agent_activity')
          .select('id, agent_id, action_type, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);

        const { data: connData } = await client
          .from('connection_requests')
          .select('id, demo_investor_id, investor_id, personal_message, status, created_at')
          .eq('founder_id', user.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;

        // Deduplicate: if both a demo-investor and direct-investor connection exist
        // for the same investor, keep only the most recent one (already ordered DESC).
        const seenKey = new Set<string>()
        const deduped = (connData ?? []).filter(c => {
          const key = c.investor_id ?? c.demo_investor_id ?? c.id
          if (seenKey.has(key)) return false
          seenKey.add(key)
          return true
        })

        let enrichedConns: Connection[] = deduped.map(c => ({ ...c, investor_name: undefined, investor_firm: undefined }));
        if (enrichedConns.length > 0) {
          const demoIds  = enrichedConns.map(c => c.demo_investor_id).filter(Boolean);
          const realIds  = enrichedConns.map(c => c.investor_id).filter(Boolean);

          // Fetch both demo investor names and real investor profile names in parallel
          const [demoRes, realRes] = await Promise.all([
            demoIds.length > 0
              ? client.from('demo_investors').select('id, name, firm').in('id', demoIds)
              : Promise.resolve({ data: [] }),
            realIds.length > 0
              ? client.from('investor_profiles').select('user_id, full_name, firm_name').in('user_id', realIds)
              : Promise.resolve({ data: [] }),
          ]);

          const demoMap: Record<string, { name: string; firm: string }> = {};
          ((demoRes.data ?? []) as { id: string; name: string; firm: string }[])
            .forEach(inv => { demoMap[inv.id] = inv; });

          const realMap: Record<string, { name: string; firm: string }> = {};
          ((realRes.data ?? []) as { user_id: string; full_name: string; firm_name: string }[])
            .forEach(inv => { realMap[inv.user_id] = { name: inv.full_name, firm: inv.firm_name }; });

          enrichedConns = enrichedConns.map(c => ({
            ...c,
            investor_name: c.demo_investor_id
              ? demoMap[c.demo_investor_id]?.name
              : c.investor_id
                ? realMap[c.investor_id]?.name
                : c.investor_name,
            investor_firm: c.demo_investor_id
              ? demoMap[c.demo_investor_id]?.firm
              : c.investor_id
                ? realMap[c.investor_id]?.firm
                : c.investor_firm,
          }));
        }

        if (!cancelled) {
          setAgentActivity(activityData ?? []);
          setConnections(enrichedConns);
          if (enrichedConns.length > 0) setSelectedConn(enrichedConns[0]);
        }
      } catch { /* empty states */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div style={{ height: '100vh', display: 'flex', background: bg, color: ink, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Left sidebar ──────────────────────────────────────── */}
      <div style={{
        width: 280, flexShrink: 0, borderRight: `1px solid ${bdr}`,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        background: surf,
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '20px 16px 14px', borderBottom: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 4 }}>Messages</p>
          <h2 style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-0.02em', color: ink, margin: 0 }}>
            {loading ? 'Loading…' : `${connections.length} connection${connections.length !== 1 ? 's' : ''}`}
          </h2>
        </div>

        {/* Investor connections */}
        {connections.length === 0 && !loading && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 12 }}>No investor connections yet.</p>
            <Link href="/founder/matching" style={{ fontSize: 12, color: blue, textDecoration: 'none', fontWeight: 500 }}>
              Find Investors →
            </Link>
          </div>
        )}

        {connections.map((c) => {
          const inv = c.investor_name ?? 'Investor';
          const initials2 = inv.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
          const isActive = selectedConn?.id === c.id;
          const canMsg = c.status === 'meeting_scheduled' || c.status === 'accepted';
          return (
            <button
              key={c.id}
              onClick={() => setSelectedConn(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', textAlign: 'left',
                background: isActive ? bg : 'transparent',
                border: 'none', borderBottom: `1px solid ${bdr}`,
                cursor: 'pointer', width: '100%',
                borderLeft: isActive ? `3px solid ${blue}` : '3px solid transparent',
                transition: 'background .12s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: canMsg ? ink : surf,
                color: canMsg ? bg : muted,
                border: `1px solid ${canMsg ? ink : bdr}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {initials2}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv}</span>
                  <span style={{ fontSize: 10, color: muted, flexShrink: 0, marginLeft: 4 }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.investor_firm && <span style={{ fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.investor_firm}</span>}
                  <StatusChip status={c.status} />
                </div>
              </div>
            </button>
          );
        })}

        {/* CXO section */}
        {agentActivity.length > 0 && (
          <div>
            <div style={{ padding: '12px 14px 6px', borderTop: `1px solid ${bdr}` }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, fontWeight: 600 }}>CXO Updates</p>
            </div>
            {agentActivity.slice(0, 5).map(a => (
              <Link
                key={a.id}
                href={`/founder/cxo/${a.agent_id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderBottom: `1px solid ${bdr}`,
                  textDecoration: 'none', transition: 'background .12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = bg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: agentColor(a.agent_id), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: agentColor(a.agent_id), textTransform: 'capitalize' }}>{a.agent_id}</span>
                  <p style={{ fontSize: 11, color: muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
                </div>
                <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedConn ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: muted }}>Select a conversation to get started</p>
            <Link href="/founder/matching" style={{ fontSize: 13, color: blue, textDecoration: 'none' }}>Browse investors →</Link>
          </div>
        ) : (
          <ThreadPanel conn={selectedConn} myUserId={myUserId} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── page export ──────────────────────────────────────────────────────────────
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F9F7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: '#8A867C', fontFamily: 'system-ui, sans-serif' }}>Loading messages…</p>
      </div>
    }>
      <MessagesInner />
    </Suspense>
  );
}

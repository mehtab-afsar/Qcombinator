'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const blue  = '#2563EB';
const green = '#16A34A';
const amber = '#D97706';

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
  demo_investor_id: string;
  personal_message: string;
  status: string;
  created_at: string;
  investor_name?: string;
  investor_firm?: string;
}

interface Notification {
  id: string;
  agent_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

// ─── status chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#FFFBEB', color: amber },
    viewed:   { bg: '#EFF6FF', color: blue  },
    accepted: { bg: '#F0FDF4', color: green },
    declined: { bg: '#FEF2F2', color: '#DC2626' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      padding: '2px 8px', borderRadius: 999,
      background: s.bg, color: s.color,
      textTransform: 'capitalize',
      border: `1px solid ${s.color}22`,
    }}>
      {status}
    </span>
  );
}

// ─── main inner ───────────────────────────────────────────────────────────────
function MessagesInner() {
  const router   = useRouter();
  const params   = useSearchParams();
  const { user } = useAuth();

  type TabKey = 'cxo' | 'investors' | 'notifications';
  const activeTab = (params.get('tab') as TabKey) ?? 'cxo';

  const [agentActivity,   setAgentActivity]   = useState<AgentActivity[]>([]);
  const [connections,     setConnections]     = useState<Connection[]>([]);
  const [notifications,   setNotifications]   = useState<Notification[]>([]);
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const client = createClient();

        // Fetch agent activity
        const { data: activityData } = await client
          .from('agent_activity')
          .select('id, agent_id, action_type, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Fetch connections
        const { data: connData } = await client
          .from('connection_requests')
          .select('id, demo_investor_id, personal_message, status, created_at')
          .eq('founder_id', user.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;

        // Enrich connections with investor names
        let enrichedConns: Connection[] = connData ?? [];
        if (enrichedConns.length > 0) {
          const investorIds = enrichedConns.map(c => c.demo_investor_id).filter(Boolean);
          if (investorIds.length > 0) {
            const { data: investors } = await client
              .from('demo_investors')
              .select('id, name, firm')
              .in('id', investorIds);
            const invMap: Record<string, { name: string; firm: string }> = {};
            (investors ?? []).forEach((inv: { id: string; name: string; firm: string }) => {
              invMap[inv.id] = { name: inv.name, firm: inv.firm };
            });
            enrichedConns = enrichedConns.map(c => ({
              ...c,
              investor_name: invMap[c.demo_investor_id]?.name,
              investor_firm: invMap[c.demo_investor_id]?.firm,
            }));
          }
        }

        const allActivity: AgentActivity[] = activityData ?? [];

        // System notifications = filtered events
        const systemTypes = ['assessment_stale', 'score_milestone', 'score_boost'];
        const notifData: Notification[] = allActivity
          .filter(a => systemTypes.includes(a.action_type))
          .map(a => ({ ...a }));

        if (!cancelled) {
          setAgentActivity(allActivity);
          setConnections(enrichedConns);
          setNotifications(notifData);
        }
      } catch {
        // gracefully show empty states
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  function selectTab(tab: TabKey) {
    router.push(`/founder/messages?tab=${tab}`);
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'cxo',           label: 'CXO Updates'            },
    { key: 'investors',     label: 'Investor Messages'       },
    { key: 'notifications', label: 'Platform Notifications'  },
  ];

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '36px 28px 72px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: muted, fontWeight: 600, marginBottom: 5 }}>
            Founder · Messages
          </p>
          <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 300, letterSpacing: '-0.03em', color: ink }}>
            Messages &amp; Updates
          </h1>
        </motion.div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, borderBottom: `1px solid ${bdr}`, marginBottom: 28,
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', fontSize: 12,
                fontWeight: activeTab === t.key ? 600 : 400,
                color: activeTab === t.key ? ink : muted,
                background: 'none', border: 'none',
                borderBottom: activeTab === t.key ? `2px solid ${ink}` : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{
              width: 20, height: 20, border: `2px solid ${bdr}`,
              borderTopColor: blue, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: 13, color: muted }}>Loading…</p>
          </div>
        )}

        {/* CXO Updates */}
        {!loading && activeTab === 'cxo' && (
          <motion.div
            key="cxo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {agentActivity.length === 0 ? (
              <div style={{
                padding: '56px 32px', textAlign: 'center',
                background: surf, borderRadius: 16, border: `1px dashed ${bdr}`,
              }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 8 }}>No agent activity yet</p>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                  Start a conversation in the CXO Suite to see updates here.
                </p>
                <a
                  href="/founder/cxo"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 16, padding: '9px 20px',
                    background: ink, color: bg,
                    fontSize: 13, fontWeight: 500, borderRadius: 999, textDecoration: 'none',
                  }}
                >
                  Open CXO Suite →
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {agentActivity.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: bg,
                      border: `1px solid ${bdr}`,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: agentColor(a.agent_id),
                      marginTop: 5, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: agentColor(a.agent_id),
                          textTransform: 'capitalize',
                        }}>
                          {a.agent_id}
                        </span>
                        <span style={{ fontSize: 10, color: muted }}>{timeAgo(a.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: ink, lineHeight: 1.5, margin: 0 }}>
                        {a.description}
                      </p>
                    </div>
                    <a
                      href={`/founder/cxo?agent=${a.agent_id}`}
                      style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 600, color: blue,
                        textDecoration: 'none', padding: '4px 10px',
                        background: `${blue}10`, borderRadius: 6,
                      }}
                    >
                      View →
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Investor Messages */}
        {!loading && activeTab === 'investors' && (
          <motion.div
            key="investors"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {connections.length === 0 ? (
              <div style={{
                padding: '56px 32px', textAlign: 'center',
                background: surf, borderRadius: 16, border: `1px dashed ${bdr}`,
              }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 8 }}>No investor connections yet</p>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                  Visit Investor Matching to connect with investors.
                </p>
                <a
                  href="/founder/matching"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    marginTop: 16, padding: '9px 20px',
                    background: ink, color: bg,
                    fontSize: 13, fontWeight: 500, borderRadius: 999, textDecoration: 'none',
                  }}
                >
                  Find Investors →
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {connections.map((c, i) => {
                  const initials = (c.investor_name ?? 'IN')
                    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '16px 18px',
                        background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: ink, color: bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>
                            {c.investor_name ?? 'Investor'}
                          </span>
                          {c.investor_firm && (
                            <span style={{ fontSize: 11, color: muted }}>· {c.investor_firm}</span>
                          )}
                          <StatusChip status={c.status} />
                          <span style={{ fontSize: 10, color: muted, marginLeft: 'auto' }}>
                            {timeAgo(c.created_at)}
                          </span>
                        </div>
                        {c.personal_message && (
                          <p style={{
                            fontSize: 12, color: muted, lineHeight: 1.5, margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {c.personal_message}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Platform Notifications */}
        {!loading && activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {notifications.length === 0 ? (
              <div style={{
                padding: '56px 32px', textAlign: 'center',
                background: surf, borderRadius: 16, border: `1px dashed ${bdr}`,
              }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 8 }}>All caught up</p>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                  No system notifications. Score milestones and alerts will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {notifications.map((n, i) => {
                  const iconMap: Record<string, string> = {
                    score_milestone: '🎯',
                    score_boost:     '⚡',
                    assessment_stale:'⚠️',
                  };
                  const icon = iconMap[n.action_type] ?? '🔔';
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 16px',
                        background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: surf, border: `1px solid ${bdr}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: ink, lineHeight: 1.5, marginBottom: 4 }}>
                          {n.description}
                        </p>
                        <p style={{ fontSize: 11, color: muted }}>
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
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

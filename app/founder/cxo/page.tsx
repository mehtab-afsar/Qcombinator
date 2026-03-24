'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const blue  = '#2563EB';
const green = '#16A34A';
const amber = '#D97706';

// ─── agent metadata ───────────────────────────────────────────────────────────
interface AgentMeta {
  id: string;
  role: string;
  name: string;
  color: string;
  emptyMsg: string;
}

const AGENTS: AgentMeta[] = [
  { id: 'patel',  role: 'CMO',                   name: 'Patel',  color: '#2563EB', emptyMsg: 'Ask Patel to build your ICP, GTM playbook, or battle card.' },
  { id: 'susi',   role: 'CRO',                   name: 'Susi',   color: '#16A34A', emptyMsg: 'Ask Susi to create outreach sequences or a sales script.' },
  { id: 'maya',   role: 'Brand Director',         name: 'Maya',   color: '#9333EA', emptyMsg: 'Ask Maya to develop your brand messaging or voice guide.' },
  { id: 'felix',  role: 'CFO',                    name: 'Felix',  color: '#D97706', emptyMsg: 'Ask Felix to model your financials or write an investor update.' },
  { id: 'leo',    role: 'General Counsel',        name: 'Leo',    color: '#DC2626', emptyMsg: 'Ask Leo to review your legal checklist or draft an NDA.' },
  { id: 'harper', role: 'Chief People Officer',   name: 'Harper', color: '#0891B2', emptyMsg: 'Ask Harper to plan your first hires or create job descriptions.' },
  { id: 'nova',   role: 'CPO',                    name: 'Nova',   color: '#DB2777', emptyMsg: 'Ask Nova to run a PMF survey or analyze customer interviews.' },
  { id: 'atlas',  role: 'Chief Strategy Officer', name: 'Atlas',  color: '#059669', emptyMsg: 'Ask Atlas for a competitive matrix or strategic battle card.' },
  { id: 'sage',   role: 'CEO Advisor',            name: 'Sage',   color: '#7C3AED', emptyMsg: 'Ask Sage to build your strategic plan or OKR roadmap.' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function qualityBadge(content: unknown): { label: string; color: string; bg: string } {
  const len = JSON.stringify(content ?? '').length;
  if (len > 800) return { label: 'Full',    color: green,  bg: '#F0FDF4' };
  if (len > 300) return { label: 'Partial', color: amber,  bg: '#FFFBEB' };
  return           { label: 'Minimal', color: muted,  bg: surf };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

// ─── types ────────────────────────────────────────────────────────────────────
interface AgentArtifact {
  id: string;
  agent_id: string;
  artifact_type: string;
  title: string;
  content: unknown;
  created_at: string;
}

// ─── artifact card ────────────────────────────────────────────────────────────
function ArtifactCard({ artifact, agentId }: { artifact: AgentArtifact; agentId: string }) {
  const q = qualityBadge(artifact.content);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        border: `1px solid ${hovered ? '#C8C3BB' : bdr}`,
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.4, flex: 1 }}>
          {artifact.title || artifact.artifact_type.replace(/_/g, ' ')}
        </p>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
          background: q.bg, color: q.color, flexShrink: 0,
          border: `1px solid ${q.color}22`,
        }}>
          {q.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
          background: surf, color: muted, border: `1px solid ${bdr}`,
          textTransform: 'capitalize',
        }}>
          {artifact.artifact_type.replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: 11, color: muted }}>{timeAgo(artifact.created_at)}</span>
      </div>
      <a
        href={`/founder/agents/${agentId}?artifact=${artifact.id}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 600, color: blue,
          textDecoration: 'none', marginTop: 2,
        }}
      >
        View →
      </a>
    </div>
  );
}

// ─── CXO inner (uses useSearchParams) ─────────────────────────────────────────
function CXOInner() {
  const router    = useRouter();
  const params    = useSearchParams();
  const { user }  = useAuth();

  const activeId  = params.get('agent') ?? 'patel';
  const activeTab = params.get('tab') ?? 'chat';

  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [counts,    setCounts]    = useState<Record<string, number>>({});
  const [loading,   setLoading]   = useState(false);

  const activeAgent = AGENTS.find(a => a.id === activeId) ?? AGENTS[0];

  // Fetch all artifact counts on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const client = createClient();
        const { data } = await client
          .from('agent_artifacts')
          .select('agent_id')
          .eq('user_id', user.id);
        if (cancelled || !data) return;
        const map: Record<string, number> = {};
        (data as { agent_id: string }[]).forEach(row => {
          map[row.agent_id] = (map[row.agent_id] ?? 0) + 1;
        });
        setCounts(map);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch artifacts for active agent when deliverables tab is open
  useEffect(() => {
    if (!user || activeTab !== 'deliverables') return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const client = createClient();
        const { data } = await client
          .from('agent_artifacts')
          .select('id, agent_id, artifact_type, title, content, created_at')
          .eq('user_id', user.id)
          .eq('agent_id', activeId)
          .order('created_at', { ascending: false });
        if (!cancelled) setArtifacts((data as AgentArtifact[]) ?? []);
      } catch {
        if (!cancelled) setArtifacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, activeId, activeTab]);

  function selectAgent(id: string) {
    const tabParam = activeTab === 'deliverables' ? '&tab=deliverables' : '';
    router.push(`/founder/cxo?agent=${id}${tabParam}`);
  }

  function selectTab(tab: string) {
    router.push(`/founder/cxo?agent=${activeId}&tab=${tab}`);
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: bg,
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
    }}>

      {/* ── Left sidebar ───────────────────────────────────────────────── */}
      <div style={{
        width: 240,
        flexShrink: 0,
        borderRight: `1px solid ${bdr}`,
        display: 'flex',
        flexDirection: 'column',
        background: bg,
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '20px 16px 12px',
          borderBottom: `1px solid ${bdr}`,
          flexShrink: 0,
        }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 4 }}>
            CXO Suite
          </p>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: ink, lineHeight: 1.2 }}>
            9 AI Executives
          </h2>
        </div>

        <div style={{ padding: '8px', flex: 1 }}>
          {AGENTS.map(agent => {
            const isActive = agent.id === activeId;
            const count    = counts[agent.id] ?? 0;
            return (
              <button
                key={agent.id}
                onClick={() => selectAgent(agent.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px',
                  borderRadius: 10,
                  marginBottom: 2,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? `${blue}0F` : 'transparent',
                  borderLeft: isActive ? `3px solid ${blue}` : '3px solid transparent',
                  transition: 'background 0.12s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = surf; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: agent.color, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? blue : ink,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                    margin: 0,
                  }}>
                    {agent.role} — {agent.name}
                  </p>
                </div>
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '1px 7px', borderRadius: 999,
                    background: surf, color: muted,
                    border: `1px solid ${bdr}`,
                    flexShrink: 0,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{
          height: 52,
          flexShrink: 0,
          borderBottom: `1px solid ${bdr}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 4,
          background: bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeAgent.color }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>
              {activeAgent.role} — {activeAgent.name}
            </span>
          </div>
          {(['chat', 'deliverables'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => selectTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12,
                fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? surf : 'transparent',
                color: activeTab === tab ? ink : muted,
                transition: 'background 0.12s',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'chat' ? 'Chat' : 'Deliverables'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Chat — iframe */}
          {activeTab === 'chat' && (
            <iframe
              key={activeId}
              src={`/founder/agents/${activeId}`}
              style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
              title={`Chat with ${activeAgent.name}`}
            />
          )}

          {/* Deliverables */}
          {activeTab === 'deliverables' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {loading ? (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <div style={{
                    width: 20, height: 20,
                    border: `2px solid ${bdr}`, borderTopColor: blue,
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 12px',
                  }} />
                  <p style={{ fontSize: 13, color: muted }}>Loading deliverables…</p>
                </div>
              ) : artifacts.length === 0 ? (
                <div style={{
                  padding: '64px 32px', textAlign: 'center',
                  background: surf, borderRadius: 16,
                  border: `1px dashed ${bdr}`,
                  maxWidth: 480, margin: '0 auto',
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: activeAgent.color, margin: '0 auto 16px',
                  }} />
                  <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 8 }}>
                    No deliverables yet
                  </p>
                  <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 20 }}>
                    {activeAgent.emptyMsg}
                  </p>
                  <button
                    onClick={() => selectTab('chat')}
                    style={{
                      padding: '9px 20px', background: ink, color: bg,
                      border: 'none', borderRadius: 999,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Start chatting →
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 4 }}>
                      {activeAgent.name}&apos;s Deliverables
                    </p>
                    <p style={{ fontSize: 13, color: muted }}>
                      {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} created
                    </p>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 14,
                  }}>
                    {artifacts.map(a => (
                      <ArtifactCard key={a.id} artifact={a} agentId={activeId} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── page with Suspense ───────────────────────────────────────────────────────
export default function CXOPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#F9F7F2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#8A867C', fontFamily: 'system-ui, sans-serif' }}>
          Loading CXO Suite…
        </p>
      </div>
    }>
      <CXOInner />
    </Suspense>
  );
}

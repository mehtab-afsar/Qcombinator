'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Lock, Clock, Copy, X, ArrowRight, Layers,
         Rocket, Mail, Bell, Globe, Users, Eye, FileText,
         BookOpen, BarChart2, Zap, TrendingUp, Brain, ArrowUpRight } from 'lucide-react';
import { renderArtifactContent } from '@/features/agents/shared/utils/renderArtifactContent';
import { CXO_CONFIGS } from '@/lib/cxo/cxo-config';
import type { CXOConfig } from '@/lib/cxo/cxo-config';
import type { AgentArtifact } from './CXOSidebar';

const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const green = '#16A34A';

const ACTION_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  deploy_landing_page:   Rocket,
  gmail_compose:         Mail,
  google_alert:          Bell,
  send_investor_update:  TrendingUp,
  generate_nda:          FileText,
  blog_post:             BookOpen,
  host_survey:           BarChart2,
  track_competitor:      Eye,
  lead_enrich:           Users,
  web_research:          Globe,
  screen_resume:         Users,
  wellfound_post:        Zap,
};

interface CXODashboardProps {
  config:                   CXOConfig;
  agentId:                  string;
  artifacts:                AgentArtifact[];
  userId?:                  string | null;
  onSwitchToChat?:          () => void;
  connectedArtifactCounts?: Record<string, number>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function SectionLabel({
  icon: Icon, label,
}: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
      <Icon size={11} style={{ color: muted }} />
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted }}>
        {label}
      </span>
    </div>
  );
}

export function CXODashboard({ config, artifacts, userId, onSwitchToChat, connectedArtifactCounts = {} }: CXODashboardProps) {
  const [selectedType,     setSelectedType]     = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<AgentArtifact | null>(null);
  const [copied,           setCopied]           = useState(false);

  const builtTypes  = new Set(artifacts.map(a => a.artifact_type));
  const doneCount   = config.deliverables.filter(d => builtTypes.has(d.artifactType)).length;
  const totalCount  = config.deliverables.length;
  const totalPts    = config.deliverables
    .filter(d => builtTypes.has(d.artifactType))
    .reduce((s, d) => s + d.dimensionBoost, 0);
  const maxPts      = config.deliverables.reduce((s, d) => s + d.dimensionBoost, 0);
  const coveragePct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const panelOpen   = selectedType !== null && selectedArtifact !== null;

  function versionsFor(type: string): AgentArtifact[] {
    return artifacts
      .filter(a => a.artifact_type === type)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  function delivStatus(type: string, prereq?: string): 'done' | 'locked' | 'available' {
    if (builtTypes.has(type))              return 'done';
    if (prereq && !builtTypes.has(prereq)) return 'locked';
    return 'available';
  }

  function openCard(type: string) {
    const versions = versionsFor(type);
    if (versions.length === 0) return;
    setSelectedType(type);
    setSelectedArtifact(versions[0]);
  }

  function closePanel() { setSelectedType(null); setSelectedArtifact(null); }

  function copyContent() {
    if (!selectedArtifact) return;
    navigator.clipboard.writeText(JSON.stringify(selectedArtifact.content, null, 2)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const stats = [
    { label: 'Completed',  value: `${doneCount}/${totalCount}`, sub: 'deliverables',    coloured: doneCount > 0 },
    { label: 'Pts Earned', value: `+${totalPts}`,               sub: `of ${maxPts} max`, coloured: totalPts > 0 },
    { label: 'Coverage',   value: `${coveragePct}%`,            sub: 'scope done',       coloured: coveragePct === 100 },
    { label: 'Iterations', value: `${artifacts.length}`,        sub: 'total versions',   coloured: false },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Main scrollable panel ── */}
      <div style={{
        width: panelOpen ? 480 : '100%',
        minWidth: panelOpen ? 480 : undefined,
        height: '100vh', overflowY: 'auto',
        borderRight: panelOpen ? `1px solid ${bdr}` : 'none',
        flexShrink: 0,
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '32px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: config.colour,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
              boxShadow: `0 2px 8px ${config.colour}40`,
            }}>
              {config.name[0]}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.2 }}>
                {config.name}
              </p>
              <p style={{ fontSize: 11, color: muted, margin: '3px 0 0' }}>
                {config.role.split('—')[1]?.trim() ?? config.role}
              </p>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {stats.map(s => (
              <div key={s.label} style={{
                padding: '14px 16px', borderRadius: 12,
                background: '#fff', border: `1px solid ${bdr}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: s.coloured ? config.colour : ink, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 10, color: muted, margin: '6px 0 0', fontWeight: 600 }}>{s.label}</p>
                <p style={{ fontSize: 9, color: muted, margin: '1px 0 0', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div style={{ padding: '0 32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted }}>Overall Progress</span>
            <span style={{ fontSize: 10, color: doneCount === totalCount ? green : muted, fontWeight: 600 }}>{coveragePct}% complete</span>
          </div>
          <div style={{ height: 5, background: surf, borderRadius: 999, overflow: 'hidden', border: `1px solid ${bdr}` }}>
            <div style={{ height: '100%', width: `${coveragePct}%`, background: doneCount === totalCount ? green : config.colour, borderRadius: 999, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>

        {/* ── Deliverables grid ── */}
        <div style={{ padding: '0 32px 32px' }}>
          <SectionLabel icon={Layers} label="Deliverables" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {config.deliverables.map(d => {
              const status     = delivStatus(d.artifactType, d.prerequisite);
              const versions   = versionsFor(d.artifactType);
              const isSelected = selectedType === d.artifactType;
              const isDone     = status === 'done';

              return (
                <button
                  key={d.artifactType}
                  onClick={() => { if (isDone) openCard(d.artifactType); }}
                  style={{
                    display: 'flex', flexDirection: 'column', padding: '14px 16px',
                    borderRadius: 12, textAlign: 'left', fontFamily: 'inherit',
                    border: `1.5px solid ${isSelected ? config.colour + '70' : bdr}`,
                    borderLeft: isDone
                      ? `4px solid ${isSelected ? config.colour : green}`
                      : `4px solid ${status === 'locked' ? '#D1CEC8' : bdr}`,
                    background: isSelected ? `${config.colour}08` : isDone ? '#fff' : surf,
                    cursor: isDone ? 'pointer' : 'default',
                    opacity: status === 'locked' ? 0.42 : 1,
                    boxShadow: isSelected ? `0 0 0 2px ${config.colour}20` : isDone ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.14s', minHeight: 88,
                  }}
                  onMouseEnter={e => { if (isDone && !isSelected) { (e.currentTarget as HTMLElement).style.background = `${config.colour}05`; (e.currentTarget as HTMLElement).style.borderColor = `${config.colour}40`; } }}
                  onMouseLeave={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.background = isDone ? '#fff' : surf; (e.currentTarget as HTMLElement).style.borderColor = bdr; } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    {isDone ? <CheckCircle2 style={{ width: 15, height: 15, color: green }} />
                      : status === 'locked' ? <Lock style={{ width: 13, height: 13, color: muted }} />
                        : <Circle style={{ width: 13, height: 13, color: muted, opacity: 0.5 }} />}
                    {isDone && <ArrowRight style={{ width: 12, height: 12, color: isSelected ? config.colour : muted }} />}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: isDone ? 600 : 400, color: isDone ? ink : muted, margin: 0, lineHeight: 1.3, flex: 1 }}>
                    {d.label}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: muted, opacity: versions.length > 0 ? 1 : 0.6 }}>
                      {versions.length > 0 ? `${versions.length > 1 ? `v${versions.length}` : 'v1'} · ${timeAgo(versions[0].created_at)}` : status === 'locked' ? 'Locked' : 'Not built yet'}
                    </span>
                    {d.dimensionBoost > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: isDone ? config.colour : muted, opacity: isDone ? 1 : 0.5 }}>
                        +{d.dimensionBoost}pts
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Quick Actions — card grid ── */}
        {config.quickActions.length > 0 && (
          <div style={{ padding: '0 32px 32px' }}>
            <div style={{ height: 1, background: bdr, marginBottom: 28 }} />
            <SectionLabel icon={Zap} label="Quick Actions" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {config.quickActions.map(action => {
                const locked   = !!action.requires && !builtTypes.has(action.requires);
                const Icon     = ACTION_ICONS[action.actionId] ?? Zap;
                const reqLabel = action.requires
                  ? config.deliverables.find(d => d.artifactType === action.requires)?.label ?? action.requires
                  : null;

                return (
                  <button
                    key={action.id}
                    onClick={() => { if (!locked) onSwitchToChat?.(); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '16px', borderRadius: 14,
                      border: `1.5px solid ${locked ? bdr : bdr}`,
                      background: locked ? surf : '#fff',
                      cursor: locked ? 'default' : 'pointer',
                      opacity: locked ? 0.5 : 1,
                      fontFamily: 'inherit', textAlign: 'left',
                      boxShadow: locked ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
                      transition: 'all 0.14s',
                      minHeight: 110,
                    }}
                    onMouseEnter={e => { if (!locked) { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${config.colour}60`; el.style.background = `${config.colour}06`; el.style.boxShadow = `0 4px 16px ${config.colour}18`; } }}
                    onMouseLeave={e => { if (!locked) { const el = e.currentTarget as HTMLElement; el.style.borderColor = bdr; el.style.background = '#fff'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; } }}
                  >
                    {/* Icon block */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, marginBottom: 12,
                      background: locked ? `${muted}14` : `${config.colour}14`,
                      border: `1.5px solid ${locked ? bdr : `${config.colour}28`}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={15} style={{ color: locked ? muted : config.colour }} />
                    </div>

                    {/* Label */}
                    <p style={{ fontSize: 12, fontWeight: 600, color: locked ? muted : ink, margin: '0 0 auto', lineHeight: 1.35 }}>
                      {action.label}
                    </p>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, width: '100%' }}>
                      {locked
                        ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={9} style={{ color: muted, opacity: 0.7 }} />
                            <span style={{ fontSize: 9, color: muted, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                              {reqLabel ? `Needs ${reqLabel.split(' ')[0]}` : 'Locked'}
                            </span>
                          </div>
                        )
                        : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: green, flexShrink: 0 }} />
                            <span style={{ fontSize: 9, color: green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ready</span>
                          </div>
                        )
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Intelligence Network — 2-col agent cards ── */}
        {config.connectedSources.length > 0 && (
          <div style={{ padding: '0 32px 32px' }}>
            <div style={{ height: 1, background: bdr, marginBottom: 28 }} />
            <SectionLabel icon={Brain} label="Intelligence Network" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {config.connectedSources.map(src => {
                const srcConfig   = CXO_CONFIGS[src.agentId];
                const colour      = srcConfig?.colour ?? muted;
                const isHigh      = src.relevance === 'high';
                const rolePart    = srcConfig?.role.split('—')[1]?.trim() ?? '';
                const artCount    = connectedArtifactCounts[src.agentId] ?? 0;
                const hasArtifacts = artCount > 0;

                return (
                  <div key={src.agentId} style={{
                    display: 'flex', flexDirection: 'column',
                    padding: '16px', borderRadius: 14,
                    background: '#fff',
                    border: `1.5px solid ${hasArtifacts ? `${colour}30` : bdr}`,
                    boxShadow: hasArtifacts ? `0 1px 6px ${colour}10` : '0 1px 4px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: `${colour}18`,
                        border: `2px solid ${colour}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, color: colour,
                      }}>
                        {(srcConfig?.name ?? src.agentId)[0].toUpperCase()}
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '3px 8px', borderRadius: 99,
                        background: isHigh ? `${colour}12` : surf,
                        color: isHigh ? colour : muted,
                        border: `1px solid ${isHigh ? `${colour}25` : bdr}`,
                        marginTop: 2,
                      }}>
                        {isHigh ? '● High' : '○ Med'}
                      </span>
                    </div>

                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.2 }}>
                      {srcConfig?.name ?? src.agentId}
                    </p>
                    <p style={{ fontSize: 10, color: muted, margin: '3px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rolePart}
                    </p>

                    {/* Live artifact status */}
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasArtifacts ? green : bdr, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: hasArtifacts ? green : muted, fontWeight: hasArtifacts ? 600 : 400 }}>
                        {hasArtifacts ? `${artCount} deliverable${artCount > 1 ? 's' : ''} ready` : 'No data yet'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Resources — 3-col cards ── */}
        {config.resources.length > 0 && (
          <div style={{ padding: '0 32px 48px' }}>
            <div style={{ height: 1, background: bdr, marginBottom: 28 }} />
            <SectionLabel icon={BookOpen} label="Resources" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {config.resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    padding: '14px', borderRadius: 14, textDecoration: 'none',
                    background: '#fff', border: `1.5px solid ${bdr}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    minHeight: 96, cursor: 'pointer',
                    transition: 'all 0.14s',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${config.colour}50`; el.style.background = `${config.colour}05`; el.style.boxShadow = `0 4px 14px ${config.colour}14`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = bdr; el.style.background = '#fff'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                >
                  {/* Top: source badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: config.colour,
                      background: `${config.colour}12`, padding: '2px 7px',
                      borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                      {r.source.split(' ')[0]}
                    </span>
                    <ArrowUpRight size={12} style={{ color: muted, opacity: 0.5 }} />
                  </div>

                  {/* Title */}
                  <p style={{ fontSize: 11, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.4, flex: 1 }}>
                    {r.title}
                  </p>

                  {/* Source name */}
                  <p style={{ fontSize: 10, color: muted, margin: '8px 0 0', opacity: 0.8 }}>
                    {r.source}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Artifact viewer panel ── */}
      {panelOpen && selectedArtifact && (() => {
        const versions    = versionsFor(selectedType!);
        const delivConfig = config.deliverables.find(d => d.artifactType === selectedType);
        const artifactRecord = {
          id:      selectedArtifact.id,
          type:    selectedArtifact.artifact_type,
          title:   selectedArtifact.title,
          content: selectedArtifact.content as Record<string, unknown>,
        };

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>

            <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `1px solid ${bdr}`, background: bg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedArtifact.title}
                </p>
                {delivConfig && (
                  <span style={{ fontSize: 10, color: config.colour, background: `${config.colour}12`, padding: '2px 8px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>
                    {delivConfig.label}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={copyContent} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: `1px solid ${bdr}`, background: bg, color: muted, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                  <Copy style={{ width: 11, height: 11 }} /> {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={closePanel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: `1px solid ${bdr}`, background: bg, color: muted, cursor: 'pointer' }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>

            {versions.length > 1 && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '8px 24px', borderBottom: `1px solid ${bdr}`, background: bg, overflowX: 'auto' }}>
                <span style={{ fontSize: 10, color: muted, fontWeight: 600, marginRight: 4, flexShrink: 0 }}>Version:</span>
                {versions.map((v, idx) => {
                  const isActive = v.id === selectedArtifact.id;
                  return (
                    <button key={v.id} onClick={() => setSelectedArtifact(v)} style={{
                      flexShrink: 0, padding: '4px 11px', borderRadius: 6,
                      border: `1px solid ${isActive ? config.colour + '50' : bdr}`,
                      background: isActive ? `${config.colour}10` : bg,
                      color: isActive ? config.colour : muted,
                      fontSize: 11, fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.12s',
                    }}>
                      <Clock style={{ width: 10, height: 10 }} />
                      v{versions.length - idx}
                      <span style={{ fontSize: 9, opacity: 0.65 }}>{timeAgo(v.created_at)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {renderArtifactContent(artifactRecord, userId)}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

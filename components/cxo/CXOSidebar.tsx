'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, BarChart2, CheckSquare, GitBranch, BookOpen, MessageCircle, LayoutDashboard,
} from 'lucide-react';
import { DeliverableItem } from './DeliverableItem';
import { ConnectedDataItem } from './ConnectedDataItem';
import type { CXOConfig } from '@/lib/cxo/cxo-config';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';

export interface AgentArtifact {
  id: string;
  agent_id: string;
  artifact_type: string;
  title: string;
  content: unknown;
  created_at: string;
}

interface CXOSidebarProps {
  config: CXOConfig;
  artifacts: AgentArtifact[];
  agentId: string;
  dimensionScore: number | null;
  view: 'dashboard' | 'chat';
  onViewChange: (v: 'dashboard' | 'chat') => void;
}

const DIMENSION_LABEL: Record<string, string> = {
  market:     'Market',
  product:    'Product',
  goToMarket: 'GTM',
  financial:  'Financial',
  team:       'Team',
  traction:   'Traction',
};

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

const W_OPEN   = 260;
const W_CLOSED = 52;

// ─── icon row (shared collapsed + expanded item) ──────────────────────────────
function SectionRow({
  icon: Icon,
  label,
  expanded,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  expanded: boolean;
  accent?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      height: 34, padding: '0 10px', marginBottom: 2,
    }}>
      <Icon style={{ height: 15, width: 15, flexShrink: 0, color: accent ?? muted }} />
      <motion.span
        animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
        transition={{ duration: 0.15 }}
        style={{
          marginLeft: 10, fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          color: muted, whiteSpace: 'nowrap', overflow: 'hidden',
        }}
      >
        {label}
      </motion.span>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export function CXOSidebar({ config, artifacts, agentId, dimensionScore, view, onViewChange }: CXOSidebarProps) {
  const [expanded,      setExpanded]      = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  // Deliverable stats
  const doneTypes  = new Set(artifacts.map(a => a.artifact_type));
  const earned     = config.deliverables
    .filter(d => doneTypes.has(d.artifactType))
    .reduce((sum, d) => sum + d.dimensionBoost, 0);
  const totalPts   = config.maxScoreContribution;
  const doneCount  = config.deliverables.filter(d => doneTypes.has(d.artifactType)).length;
  const totalCount = config.deliverables.length;
  const lastArtifact = artifacts[0];

  // Dimension score bar colour
  const dimScore   = dimensionScore ?? 0;
  const dimPct     = dimensionScore !== null ? dimScore / 100 : null;
  const barColour  = dimPct === null ? surf : dimPct >= 0.7 ? '#16A34A' : dimPct >= 0.5 ? config.colour : '#D97706';
  const dimLabel   = DIMENSION_LABEL[config.primaryDimension] ?? 'Score';

  // Role first letter for the collapsed icon
  const roleInitial = config.role[0]?.toUpperCase() ?? '?';

  function deliverableHref(type: string, artifactId?: string): string {
    if (artifactId) return `/founder/cxo/${agentId}?artifact=${artifactId}`;
    return `/founder/cxo/${agentId}?prompt=${encodeURIComponent(`Let's create a ${type.replace(/_/g, ' ')}.`)}`;
  }

  return (
    <motion.nav
      style={{
        position:      'fixed',
        left:          0, top: 0,
        zIndex:        40,
        height:        '100vh',
        background:    bg,
        borderRight:   `1px solid ${bdr}`,
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
        fontFamily:    'system-ui, sans-serif',
      }}
      animate={{ width: expanded ? W_OPEN : W_CLOSED }}
      transition={{ ease: 'easeOut', duration: 0.2 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setResourcesOpen(false); }}
    >

      {/* ── Top: back + role identity ────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: `1px solid ${bdr}`,
        display: 'flex', alignItems: 'center',
        padding: '0 10px', gap: 10,
      }}>
        {/* Back arrow — always visible */}
        <Link
          href="/founder/cxo"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, flexShrink: 0,
            borderRadius: 7,
            background: surf, border: `1px solid ${bdr}`,
            color: muted, textDecoration: 'none',
            transition: 'background 0.12s',
          }}
          title="Back to CXO Suite"
        >
          <ArrowLeft style={{ width: 13, height: 13 }} />
        </Link>

        {/* Role label — fades in when expanded */}
        <motion.div
          animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
          transition={{ duration: 0.15 }}
          style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: ink, lineHeight: 1.2, margin: 0 }}>
            {config.name}
          </p>
          <p style={{ fontSize: 10, color: muted, margin: 0 }}>
            {dimLabel} · {dimensionScore !== null ? `${dimensionScore}/100` : '—'}
          </p>
        </motion.div>
      </div>

      {/* ── View switcher: Dashboard | Chat ─────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '6px 6px 0',
        display: 'flex',
        gap: 4,
        borderBottom: `1px solid ${bdr}`,
        paddingBottom: 6,
      }}>
        {([
          { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'chat'      as const, icon: MessageCircle,   label: 'Chat'      },
        ] as { id: 'dashboard' | 'chat'; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              title={label}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: expanded ? 'flex-start' : 'center',
                gap: 6,
                height: 32,
                padding: expanded ? '0 10px' : '0',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                background: active ? config.colour + '18' : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = surf; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon style={{ width: 14, height: 14, flexShrink: 0, color: active ? config.colour : muted }} />
              <motion.span
                animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  color: active ? config.colour : muted,
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
              >
                {label}
              </motion.span>
            </button>
          );
        })}
      </div>

      {/* ── Middle: scrollable content ───────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 6px' }}>

        {/* Role colour badge row — always visible as accent dot, expands to header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 10px', height: 40,
          marginBottom: 4,
          borderLeft: expanded ? `3px solid ${config.colour}` : '3px solid transparent',
          transition: 'border-color 0.2s',
        }}>
          {/* Colour dot (collapsed) / role initial (always) */}
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: config.colour,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff',
          }}>
            {roleInitial}
          </div>

          <motion.div
            animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
            transition={{ duration: 0.15 }}
            style={{ marginLeft: 10, overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.3 }}>
              {config.role.split('—')[0]?.trim()}
            </p>
            <p style={{ fontSize: 10, color: muted, margin: 0, lineHeight: 1.3 }}>
              {config.role.split('—')[1]?.trim()}
            </p>
          </motion.div>
        </div>

        <div style={{ height: 1, background: bdr, margin: '4px 4px 6px' }} />

        {/* ── Dashboard ──────────────────────────────────────────────── */}
        <SectionRow icon={BarChart2} label="Dashboard" expanded={expanded} />

        <motion.div
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ padding: '0 10px 10px', overflow: 'hidden' }}
        >
          {/* Score bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: muted }}>{dimLabel} Score</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>
                {dimensionScore !== null ? dimensionScore : '—'}
              </span>
            </div>
            <div style={{ height: 4, background: surf, borderRadius: 999, overflow: 'hidden', border: `1px solid ${bdr}` }}>
              <div style={{
                height: '100%',
                width: dimPct !== null ? `${dimPct * 100}%` : '0%',
                background: barColour,
                borderRadius: 999,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: muted }}>Deliverables</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: ink }}>{doneCount}/{totalCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: muted }}>Pts earned</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: config.colour }}>+{earned}/{totalPts}</span>
            </div>
            {lastArtifact && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: muted }}>Last active</span>
                <span style={{ fontSize: 11, color: muted }}>{timeAgo(lastArtifact.created_at)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Collapsed dashboard: just a small progress pill */}
        <motion.div
          animate={{ opacity: expanded ? 0 : dimPct !== null ? 1 : 0 }}
          transition={{ duration: 0.1 }}
          style={{ padding: '0 10px 8px', pointerEvents: 'none' }}
        >
          <div style={{ height: 3, background: surf, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: dimPct !== null ? `${dimPct * 100}%` : '0%',
              background: barColour,
              borderRadius: 999,
            }} />
          </div>
        </motion.div>

        <div style={{ height: 1, background: bdr, margin: '0 4px 6px' }} />

        {/* ── Deliverables ───────────────────────────────────────────── */}
        <SectionRow icon={CheckSquare} label="Deliverables" expanded={expanded} accent={doneCount === totalCount ? '#16A34A' : muted} />

        {/* Expanded: full list */}
        <motion.div
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ padding: '0 4px 4px', overflow: 'hidden' }}
        >
          {config.deliverables.map(d => {
            const isDone   = doneTypes.has(d.artifactType);
            const artifact = artifacts.find(a => a.artifact_type === d.artifactType);
            const prereqMet = d.prerequisite ? doneTypes.has(d.prerequisite) : true;
            return (
              <DeliverableItem
                key={d.artifactType}
                artifactType={d.artifactType}
                label={d.label}
                status={isDone ? 'done' : 'missing'}
                boostPts={d.dimensionBoost}
                href={deliverableHref(d.artifactType, isDone && artifact ? artifact.id : undefined)}
                prerequisiteMet={prereqMet}
              />
            );
          })}
        </motion.div>

        {/* Collapsed: deliverable dots */}
        <motion.div
          animate={{ opacity: expanded ? 0 : 1 }}
          transition={{ duration: 0.1 }}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 4,
            padding: '0 14px 8px', pointerEvents: 'none',
          }}
        >
          {config.deliverables.map(d => (
            <div
              key={d.artifactType}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: doneTypes.has(d.artifactType) ? config.colour : bdr,
                border: `1.5px solid ${doneTypes.has(d.artifactType) ? config.colour : muted}`,
              }}
            />
          ))}
        </motion.div>

        {/* ── Cross-agent context ────────────────────────────────────── */}
        {config.connectedSources.length > 0 && (
          <>
            <div style={{ height: 1, background: bdr, margin: '0 4px 6px' }} />
            <SectionRow icon={GitBranch} label="Context" expanded={expanded} />
            <motion.div
              animate={{ opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              style={{ padding: '0 4px 4px', overflow: 'hidden' }}
            >
              {config.connectedSources.map(src => (
                <ConnectedDataItem
                  key={src.agentId}
                  agentId={src.agentId}
                  label={src.label}
                  relevance={src.relevance}
                  hasArtifacts={false}
                />
              ))}
            </motion.div>
          </>
        )}

        {/* ── Resources (collapsible section) ───────────────────────── */}
        {config.resources.length > 0 && (
          <>
            <div style={{ height: 1, background: bdr, margin: '0 4px 6px' }} />
            <button
              onClick={() => setResourcesOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center',
                height: 34, padding: '0 10px', marginBottom: 2,
                width: '100%', background: 'none', border: 'none',
                cursor: expanded ? 'pointer' : 'default',
                borderRadius: 8,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (expanded) (e.currentTarget as HTMLElement).style.background = surf; }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              <BookOpen style={{ height: 15, width: 15, flexShrink: 0, color: muted }} />
              <motion.div
                animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  marginLeft: 10, display: 'flex', alignItems: 'center',
                  flex: 1, overflow: 'hidden', whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted }}>
                  Resources
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: muted, transition: 'transform 0.15s', transform: resourcesOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>
                  ▶
                </span>
              </motion.div>
            </button>

            {resourcesOpen && expanded && config.resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '7px 10px',
                  borderRadius: 8, textDecoration: 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = surf)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <p style={{ fontSize: 11, fontWeight: 500, color: ink, margin: 0, lineHeight: 1.3 }}>{r.title}</p>
                <p style={{ fontSize: 10, color: muted, margin: '1px 0 0', lineHeight: 1.3 }}>{r.source} ↗</p>
              </a>
            ))}
          </>
        )}
      </div>

    </motion.nav>
  );
}

'use client';

import { useState } from 'react';
import { ConnectedDataItem } from './ConnectedDataItem';
import type { CXOConfig } from '@/lib/cxo/cxo-config';
import type { AgentArtifact } from './CXOSidebar';

const ink   = '#18160F';
const muted = '#8A867C';
const bdr   = '#E2DDD5';
const surf  = '#F0EDE6';
const green = '#16A34A';
const amber = '#D97706';

interface CXOActionsProps {
  config: CXOConfig;
  artifacts: AgentArtifact[];
  agentId: string;
  userId: string;
}

export function CXOActions({ config, artifacts, agentId }: CXOActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [toast,   setToast]   = useState<string | null>(null);

  const doneTypes = new Set(artifacts.map(a => a.artifact_type));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAction(actionId: string) {
    if (loading) return;
    setLoading(actionId);
    try {
      const res = await fetch('/api/agents/action', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ actionId, agentId }),
      });
      const data = await res.json();

      if (data.type === 'handoff') {
        if (data.clipboardContent) {
          try { await navigator.clipboard.writeText(data.clipboardContent); } catch { /* ok */ }
        }
        if (data.deepLink) window.open(data.deepLink, '_blank');
        showToast('Opened — content copied to clipboard');
      } else if (data.ok) {
        showToast('Done!');
      } else {
        showToast(data.error ?? 'Something went wrong');
      }
    } catch {
      showToast('Action failed — try again');
    } finally {
      setLoading(null);
    }
  }

  // Drafts: artifacts with very short content (quality=minimal)
  const drafts = artifacts.filter(a => {
    const len = JSON.stringify(a.content ?? '').length;
    return len > 0 && len < 300;
  });

  return (
    <div style={{
      width:         240,
      flexShrink:    0,
      background:    '#FFFFFF',
      borderLeft:    `1px solid ${bdr}`,
      display:       'flex',
      flexDirection: 'column',
      overflowY:     'auto',
      padding:       '20px 16px',
      fontFamily:    'system-ui, sans-serif',
      position:      'relative',
    }}>

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position:   'absolute', top: 12, left: 12, right: 12,
          background: ink, color: '#FFF',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 12, fontWeight: 500, zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, fontWeight: 600, margin: '0 0 10px' }}>
          QUICK ACTIONS
        </p>
        {config.quickActions.map(action => {
          const isDisabled = !!(action.requires && !doneTypes.has(action.requires));
          const isLoading  = loading === action.actionId;

          return (
            <button
              key={action.id}
              disabled={isDisabled || !!loading}
              onClick={() => handleAction(action.actionId)}
              title={isDisabled ? `Requires a ${action.requires?.replace(/_/g, ' ')} first` : undefined}
              style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent: 'space-between',
                width:         '100%',
                height:        36,
                padding:       '0 12px',
                marginBottom:  6,
                border:        `1px solid ${isDisabled ? '#E8E5DF' : bdr}`,
                borderRadius:  6,
                background:    isDisabled ? '#FAFAF8' : '#FFFFFF',
                color:         isDisabled ? '#C0BDB5' : ink,
                fontSize:      13,
                fontFamily:    'system-ui, sans-serif',
                cursor:        isDisabled ? 'not-allowed' : 'pointer',
                transition:    'background 0.12s, border-color 0.12s',
                textAlign:     'left',
              }}
              onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = surf; }}
              onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {action.label}
              </span>
              {isLoading && (
                <span style={{
                  width: 12, height: 12, border: `2px solid ${bdr}`,
                  borderTopColor: ink, borderRadius: '50%',
                  animation: 'cxo-spin 0.7s linear infinite', flexShrink: 0,
                }} />
              )}
              {action.needsConfirmation && !isLoading && (
                <span style={{ fontSize: 10, color: amber, flexShrink: 0 }}>⚡</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Connected Agents ──────────────────────────────────────── */}
      {config.connectedSources.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, fontWeight: 600, margin: '0 0 6px' }}>
            FEEDS FROM
          </p>
          {config.connectedSources.filter(s => s.relevance === 'high').map(src => (
            <ConnectedDataItem
              key={src.agentId}
              agentId={src.agentId}
              label={src.label}
              relevance={src.relevance}
              hasArtifacts={false}
            />
          ))}
        </div>
      )}

      {/* ── Pending Drafts ─────────────────────────────────────────── */}
      {drafts.length > 0 && (
        <div>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: amber, fontWeight: 600, margin: '0 0 8px' }}>
            PENDING
          </p>
          {drafts.map(d => (
            <a
              key={d.id}
              href={`/founder/cxo/${agentId}?_embed=1&artifact=${d.id}`}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '7px 10px',
                marginBottom:   4,
                borderRadius:   8,
                border:         `1px solid ${amber}33`,
                background:     '#FFFBEB',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 12, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.title || d.artifact_type.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 11, color: amber, flexShrink: 0, marginLeft: 6 }}>Continue →</span>
            </a>
          ))}
        </div>
      )}

      {/* ── Connected indicator ────────────────────────────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, background: surf }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: green }} />
          <span style={{ fontSize: 11, color: muted }}>Live context synced</span>
        </div>
      </div>

      <style>{`@keyframes cxo-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

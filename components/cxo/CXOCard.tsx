'use client';

import { useState } from 'react';
import type { CXOConfig } from '@/lib/cxo/cxo-config';

const ink   = '#18160F';
const muted = '#8A867C';
const bdr   = '#E2DDD5';
const surf  = '#F0EDE6';
const green = '#16A34A';
const amber = '#D97706';

interface CXOCardProps {
  config: CXOConfig;
  artifactCount: number;
  latestArtifactTitle?: string;
  hasScoreChallenge: boolean;
  onClick: () => void;
}

export function CXOCard({ config, artifactCount, latestArtifactTitle, hasScoreChallenge, onClick }: CXOCardProps) {
  const [hovered, setHovered] = useState(false);

  const totalDeliverables = config.deliverables.length;
  const pct = totalDeliverables > 0 ? Math.min(1, artifactCount / totalDeliverables) : 0;
  const isComplete = artifactCount >= totalDeliverables && totalDeliverables > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border:        `1px solid ${hovered ? config.colour : bdr}`,
        borderRadius:  10,
        background:    '#FFFFFF',
        padding:       '0 0 18px',
        cursor:        'pointer',
        transition:    'border-color 0.15s',
        overflow:      'hidden',
        fontFamily:    'system-ui, sans-serif',
        userSelect:    'none',
      }}
    >
      {/* Colour accent top bar */}
      <div style={{ height: 4, background: config.colour }} />

      <div style={{ padding: '16px 18px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.3 }}>
              {config.role.split(' — ')[0]}
            </p>
            {isComplete && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: '#F0FDF4', color: green, border: `1px solid ${green}33` }}>
                Complete
              </span>
            )}
            {hasScoreChallenge && !isComplete && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: '#FFFBEB', color: amber, border: `1px solid ${amber}33` }}>
                Needs attention
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>{config.name}</p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 4, background: surf, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct * 100}%`,
              background: config.colour, borderRadius: 999,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: muted, margin: '5px 0 0' }}>
            {artifactCount} of {totalDeliverables} deliverables
          </p>
        </div>

        {/* Latest artifact */}
        {latestArtifactTitle ? (
          <p style={{
            fontSize: 11, color: muted,
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            borderTop: `1px solid ${bdr}`, paddingTop: 10,
          }}>
            Latest: {latestArtifactTitle}
          </p>
        ) : (
          <p style={{
            fontSize: 11, color: '#C0BDB5', margin: 0,
            borderTop: `1px solid ${bdr}`, paddingTop: 10,
          }}>
            Not started yet
          </p>
        )}
      </div>
    </div>
  );
}

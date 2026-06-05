'use client';

import { useState } from 'react';
import type { CXOConfig } from '@/lib/cxo/cxo-config';

const ink   = '#18160F';
const muted = '#8A867C';
const bdr   = '#E8E4DE';
const surf  = '#F9F7F2';

interface CXOCardProps {
  config:              CXOConfig;
  artifactCount:       number;
  latestArtifactTitle?: string;
  hasScoreChallenge:   boolean;
  onClick:             () => void;
}

export function CXOCard({ config, artifactCount, latestArtifactTitle, hasScoreChallenge, onClick }: CXOCardProps) {
  const [hovered, setHovered] = useState(false);

  const total      = config.deliverables.length;
  const pct        = total > 0 ? Math.min(1, artifactCount / total) : 0;
  const isComplete = artifactCount >= total && total > 0;

  // Role label — first part before dash or em-dash
  const roleLabel  = config.role.split(/[—–-]/)[0].trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border:      `1px solid ${hovered ? '#D0CCC5' : bdr}`,
        borderRadius: 12,
        background:   hovered ? surf : '#fff',
        padding:      '20px 20px 16px',
        cursor:       'pointer',
        transition:   'background 0.12s, border-color 0.12s',
        fontFamily:   'system-ui, sans-serif',
        userSelect:   'none',
        display:      'flex',
        flexDirection: 'column',
        gap:          16,
      }}
    >
      {/* Top: name + color dot */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: '0 0 3px', lineHeight: 1.2 }}>
            {config.name}
          </p>
          <p style={{ fontSize: 12, color: muted, margin: 0 }}>{roleLabel}</p>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: 999,
          background: isComplete ? '#16A34A' : hasScoreChallenge ? '#D97706' : config.colour,
          flexShrink: 0, marginTop: 5,
          opacity: isComplete || hasScoreChallenge ? 1 : 0.5,
        }} />
      </div>

      {/* Progress */}
      <div>
        <div style={{ height: 2, background: bdr, borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, background: config.colour, borderRadius: 999, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p style={{ fontSize: 11, color: muted, margin: 0 }}>
            {artifactCount === 0 ? 'No deliverables yet' : `${artifactCount} of ${total} deliverables`}
          </p>
          {isComplete && <p style={{ fontSize: 11, color: '#16A34A', margin: 0 }}>Complete</p>}
          {hasScoreChallenge && !isComplete && <p style={{ fontSize: 11, color: '#D97706', margin: 0 }}>Weak area</p>}
        </div>
      </div>

      {/* Latest */}
      <p style={{
        fontSize: 11, color: latestArtifactTitle ? muted : '#C0BDB5',
        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        borderTop: `1px solid ${bdr}`, paddingTop: 12,
      }}>
        {latestArtifactTitle ?? 'Ready to brief'}
      </p>
    </div>
  );
}

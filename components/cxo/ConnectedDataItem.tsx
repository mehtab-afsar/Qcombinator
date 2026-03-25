'use client';

import Link from 'next/link';

const green = '#16A34A';
const blue  = '#2563EB';
const ink   = '#18160F';
const muted = '#8A867C';

interface ConnectedDataItemProps {
  agentId: string;
  label: string;
  relevance: string;
  hasArtifacts: boolean;
}

export function ConnectedDataItem({ agentId, label, relevance, hasArtifacts }: ConnectedDataItemProps) {
  return (
    <Link
      href={`/founder/cxo/${agentId}`}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         10,
        padding:     '7px 10px',
        borderRadius: 8,
        textDecoration: 'none',
        transition:  'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F0EDE6')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Status dot */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: hasArtifacts ? green : '#D1CEC8',
      }} />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: ink, margin: 0, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </p>
        <p style={{ fontSize: 10, color: muted, margin: 0, lineHeight: 1.3, textTransform: 'capitalize' }}>
          {relevance} relevance
        </p>
      </div>

      {/* Arrow */}
      <span style={{ fontSize: 11, color: blue, flexShrink: 0 }}>→</span>
    </Link>
  );
}

'use client';

import { useRouter } from 'next/navigation';

const green = '#16A34A';
const amber = '#D97706';
const muted = '#8A867C';
const ink   = '#18160F';
const bdr   = '#E2DDD5';
const surf  = '#F0EDE6';

export type DeliverableStatus = 'done' | 'pending' | 'missing';

interface DeliverableItemProps {
  artifactType: string;
  label: string;
  status: DeliverableStatus;
  boostPts: number;
  href: string;
  prerequisiteMet?: boolean;
}

export function DeliverableItem({
  label,
  status,
  boostPts,
  href,
  prerequisiteMet = true,
}: DeliverableItemProps) {
  const router  = useRouter();
  const locked  = !prerequisiteMet;

  const dotColor =
    locked    ? '#D1CEC8' :
    status === 'done'    ? green :
    status === 'pending' ? amber :
    '#D1CEC8';

  const badgeText =
    status === 'done'    ? 'Full' :
    status === 'pending' ? 'Draft' :
    null;

  const badgeStyle = status === 'done'
    ? { background: '#F0FDF4', color: green,  border: `1px solid ${green}22` }
    : { background: '#FFFBEB', color: amber,  border: `1px solid ${amber}22` };

  function handleClick() {
    if (locked) return;
    router.push(href);
  }

  return (
    <div
      role="button"
      tabIndex={locked ? -1 : 0}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      title={locked ? 'Complete a prerequisite deliverable first' : undefined}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           10,
        padding:       '8px 10px',
        borderRadius:  8,
        cursor:        locked ? 'default' : 'pointer',
        opacity:       locked ? 0.45 : 1,
        transition:    'background 0.12s',
        userSelect:    'none',
      }}
      onMouseEnter={e => { if (!locked) (e.currentTarget as HTMLElement).style.background = surf; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dotColor, flexShrink: 0,
        border: status === 'missing' && !locked ? `1px solid ${bdr}` : 'none',
      }} />

      {/* Label + badge */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 12, fontWeight: status === 'done' ? 600 : 400,
          color: locked ? muted : ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        {badgeText && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            padding: '1px 6px', borderRadius: 999,
            flexShrink: 0,
            ...badgeStyle,
          }}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Boost pts */}
      <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>+{boostPts}pts</span>
    </div>
  );
}

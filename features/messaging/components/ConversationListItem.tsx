"use client";

import { ReactNode } from 'react';
import { bg, surf, ink, muted, indigo } from '@/lib/constants/colors';
import { avatarPalette, initials } from '@/features/messaging/lib/format';

interface ConversationListItemProps {
  avatarSeed: string;
  title: string;
  timestamp: string;
  /** Secondary line, left-aligned, truncated — a preview, or "Name · Industry". */
  subtitleLeft: string;
  /** Right-aligned slot on the subtitle row — a status Badge, a Q-score pill, etc.
   *  The row itself has no opinion on what this is; the caller decides. */
  subtitleRight?: ReactNode;
  unread?: boolean;
  active: boolean;
  onClick: () => void;
}

export function ConversationListItem({
  avatarSeed, title, timestamp, subtitleLeft, subtitleRight, unread = false, active, onClick,
}: ConversationListItemProps) {
  const pal = avatarPalette(avatarSeed);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 11,
        padding: '9px 10px 9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: active ? `${indigo}08` : 'transparent',
        boxShadow: active ? `inset 2px 0 0 ${indigo}` : 'none',
        transition: 'background .12s', textAlign: 'left', fontFamily: 'inherit', marginBottom: 1,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = surf; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: pal.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: pal.color, letterSpacing: '0.02em',
        }}>
          {initials(avatarSeed)}
        </div>
        {unread && (
          <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: indigo, border: `2px solid ${bg}` }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <p style={{ fontSize: 13, fontWeight: unread ? 700 : 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 10, color: muted, flexShrink: 0, marginLeft: 8, margin: 0 }}>{timestamp}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <p style={{
            fontSize: 11, color: unread ? ink : muted, fontWeight: unread ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: 0,
          }}>{subtitleLeft}</p>
          {subtitleRight}
        </div>
      </div>
    </button>
  );
}

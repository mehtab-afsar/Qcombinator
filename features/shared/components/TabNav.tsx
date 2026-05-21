"use client";

import { bdr, ink, muted } from '@/lib/constants/colors';
import { font } from '@/features/shared/tokens';

interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface TabNavProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  style?: React.CSSProperties;
}

export function TabNav({ tabs, active, onChange, style }: TabNavProps) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: `1px solid ${bdr}`,
      gap: 0,
      ...style,
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              fontSize: font.size.sm,
              fontWeight: isActive ? font.weight.semibold : font.weight.normal,
              color: isActive ? ink : muted,
              background: 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${ink}` : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.12s, border-color 0.12s',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = ink; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = muted; }}
          >
            {Icon && <Icon style={{ width: 13, height: 13 }} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

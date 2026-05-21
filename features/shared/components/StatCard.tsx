"use client";

import Link from 'next/link';
import { bg, surf, bdr, ink, muted, blue, alpha } from '@/lib/constants/colors';
import { radius, shadow } from '@/features/shared/tokens';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  href?: string;
  delta?: { value: number; positive: boolean };
  style?: React.CSSProperties;
}

export function StatCard({ icon: Icon, label, value, sub, color = blue, href, delta, style }: StatCardProps) {
  const card = (
    <div
      style={{
        background: surf,
        border: `1px solid ${bdr}`,
        borderRadius: radius.lg,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: `box-shadow ${href ? '0.15s' : '0'}, border-color 0.15s`,
        cursor: href ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={e => { if (href) (e.currentTarget as HTMLElement).style.boxShadow = shadow.md; }}
      onMouseLeave={e => { if (href) (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: radius.md,
        background: alpha(color, 0.12),
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ width: 16, height: 16, color }} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.03em', color: ink, lineHeight: 1 }}>
            {value}
          </span>
          {delta !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 600, marginBottom: 3,
              color: delta.positive ? '#16A34A' : '#DC2626',
            }}>
              {delta.positive ? '+' : ''}{delta.value}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, marginTop: 4 }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{sub}</p>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{card}</Link>;
  return card;
}

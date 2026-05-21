"use client";

import { bg, bdr, ink, muted } from '@/lib/constants/colors';
import { radius, font } from '@/features/shared/tokens';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

export function SectionCard({ title, subtitle, action, children, noPadding, style, bodyStyle }: SectionCardProps) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${bdr}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${bdr}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            {title && (
              <p style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: ink, lineHeight: 1.3 }}>
                {title}
              </p>
            )}
            {subtitle && (
              <p style={{ fontSize: font.size.sm, color: muted, marginTop: 2 }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      <div style={noPadding ? bodyStyle : { padding: 20, ...bodyStyle }}>
        {children}
      </div>
    </div>
  );
}

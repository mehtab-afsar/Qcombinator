"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { ink, muted, blue } from '@/lib/constants/colors';
import { font, duration } from '@/features/shared/tokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: { label: string; href: string };
  style?: React.CSSProperties;
}

/**
 * Absorbs the "eyebrow + h1 + entrance motion" convention most founder pages hand-roll
 * separately today — a page adopting this gets the animation for free instead of picking its
 * own duration (the audit found values from 0.2s to 1.4s with no shared constant). Fade + 8px
 * rise, no bespoke easing curve — only 4 places in the app bother setting one explicitly, so
 * this doesn't add a 5th convention.
 */
export function PageHeader({ title, subtitle, action, back, style }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: parseFloat(duration.normal) }}
      style={{ marginBottom: 28, ...style }}>
      {back && (
        <Link href={back.href} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: font.size.sm, color: muted, textDecoration: 'none',
          marginBottom: 12,
          transition: 'color 0.12s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = blue)}
          onMouseLeave={e => (e.currentTarget.style.color = muted)}
        >
          <ChevronLeft style={{ width: 13, height: 13 }} />
          {back.label}
        </Link>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          {subtitle && (
            <p style={{
              fontSize: font.size.sm,
              fontWeight: font.weight.medium,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: muted,
              marginBottom: 6,
            }}>
              {subtitle}
            </p>
          )}
          <h1 style={{
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            fontWeight: 300,
            letterSpacing: '-0.03em',
            color: ink,
            lineHeight: 1.1,
            margin: 0,
          }}>
            {title}
          </h1>
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </motion.div>
  );
}

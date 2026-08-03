import { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { bg, bdr, ink, muted } from '@/features/shared/tokens'
import Link from 'next/link'

interface EmptyStateProps {
  /** A lucide icon component, e.g. `icon={Inbox}` — not an emoji. The audit found empty states
   *  across the app split between lucide icons and literal emoji characters for the same visual
   *  role; this picks one, matching how every other icon in the app is already sourced. */
  icon?: LucideIcon
  title: string
  body?: string
  action?: { label: string; href?: string; onClick?: () => void }
  style?: CSSProperties
}

export function EmptyState({ icon: Icon, title, body, action, style }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      padding: '64px 32px',
      border: `1.5px dashed ${bdr}`,
      borderRadius: 16,
      background: bg,
      ...style,
    }}>
      {Icon && <div style={{ marginBottom: 16 }}><Icon size={32} color={muted} strokeWidth={1.5} /></div>}
      <h3 style={{ fontSize: 16, fontWeight: 600, color: ink, margin: '0 0 8px' }}>{title}</h3>
      {body && (
        <p style={{ fontSize: 13, color: muted, margin: '0 0 20px', lineHeight: 1.6, maxWidth: 360 }}>{body}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', background: ink, color: bg,
              borderRadius: 999, textDecoration: 'none',
              fontSize: 13, fontWeight: 600,
            }}
          >{action.label}</Link>
        ) : (
          <button
            onClick={action.onClick}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', background: ink, color: bg,
              border: 'none', borderRadius: 999, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >{action.label}</button>
        )
      )}
    </div>
  )
}

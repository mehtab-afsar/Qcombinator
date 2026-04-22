import { CSSProperties } from 'react'
import { bg, bdr, ink, muted } from '@/features/shared/tokens'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: string
  title: string
  body?: string
  action?: { label: string; href?: string; onClick?: () => void }
  style?: CSSProperties
}

export function EmptyState({ icon = '📋', title, body, action, style }: EmptyStateProps) {
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
      {icon && <div style={{ fontSize: 32, marginBottom: 16, lineHeight: 1 }}>{icon}</div>}
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

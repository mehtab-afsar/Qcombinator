import { CSSProperties } from 'react'
import { blue, bdr } from '@/features/shared/tokens'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  style?: CSSProperties
}

const SIZE_MAP = { sm: 16, md: 24, lg: 32, xl: 44 } as const
const BORDER_MAP = { sm: 2, md: 2.5, lg: 3, xl: 3.5 } as const

export function Spinner({ size = 'md', color = blue, style }: SpinnerProps) {
  const px = SIZE_MAP[size]
  const bw = BORDER_MAP[size]
  return (
    <>
      <div
        style={{
          width: px, height: px, borderRadius: '50%',
          border: `${bw}px solid ${bdr}`,
          borderTopColor: color,
          animation: 'ea-spin 0.7s linear infinite',
          flexShrink: 0,
          ...style,
        }}
      />
      <style>{`@keyframes ea-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

/** Full-page centered spinner with optional label */
export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, background: '#F9F7F2', zIndex: 9999,
    }}>
      <Spinner size="xl" />
      {label && <p style={{ fontSize: 14, color: '#8A867C', margin: 0 }}>{label}</p>}
    </div>
  )
}

/** Inline section-level loading state */
export function SectionSpinner({ label = 'Loading…', minHeight = 200 }: { label?: string; minHeight?: number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, minHeight, padding: 32,
    }}>
      <Spinner size="md" />
      {label && <p style={{ fontSize: 13, color: '#8A867C', margin: 0 }}>{label}</p>}
    </div>
  )
}

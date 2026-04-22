import { muted } from '@/lib/constants/colors'

interface LabelProps {
  children: React.ReactNode
  optional?: boolean
}

export function Label({ children, optional }: LabelProps) {
  return (
    <label style={{
      fontSize: 12, fontWeight: 700, color: muted,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      display: 'block', marginBottom: 10,
    }}>
      {children}
      {optional && (
        <span style={{ fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0, color: muted, fontSize: 11 }}>
          optional
        </span>
      )}
    </label>
  )
}

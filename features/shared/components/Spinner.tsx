import { CSSProperties, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun, Star, type LucideIcon } from 'lucide-react'
import { blue, bdr, ink, muted } from '@/features/shared/tokens'

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
  )
}

/** Full-page centered spinner with optional label — use for page-level loading states */
export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, background: '#F9F7F2', zIndex: 9999,
    }}>
      <Spinner size="xl" />
      {label && <p style={{ fontSize: 14, color: muted, margin: 0 }}>{label}</p>}
    </div>
  )
}

const DEFAULT_CYCLE_ICONS: LucideIcon[] = [Moon, Sun, Star]

/**
 * Full-page loader that cycles through a small set of icons (default: moon → sun →
 * star) instead of a spinning ring — a calmer, "settling into place" loading feel
 * for surfaces that take a beat (e.g. switching between executives).
 */
export function PageIconLoader({ label = 'Loading…', icons = DEFAULT_CYCLE_ICONS }: { label?: string; icons?: LucideIcon[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setI(n => (n + 1) % icons.length), 900)
    return () => clearInterval(timer)
  }, [icons.length])
  const Icon = icons[i]
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, background: '#F9F7F2', zIndex: 9999,
    }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.7, rotate: 8 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon size={30} color={ink} strokeWidth={1.5} />
          </motion.div>
        </AnimatePresence>
      </div>
      {label && <p style={{ fontSize: 14, color: muted, margin: 0 }}>{label}</p>}
    </div>
  )
}

/** Inline section-level loading state — use for content areas that are still loading */
export function SectionSpinner({ label = 'Loading…', minHeight = 200 }: { label?: string; minHeight?: number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, minHeight, padding: 32,
    }}>
      <Spinner size="md" />
      {label && <p style={{ fontSize: 13, color: muted, margin: 0 }}>{label}</p>}
    </div>
  )
}

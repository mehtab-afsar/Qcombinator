import { CSSProperties } from 'react'
import { surf, bdr } from '@/features/shared/tokens'

interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number
  style?: CSSProperties
}

/** Single skeleton shimmer block */
export function Skeleton({ width = '100%', height = 16, radius = 6, style }: SkeletonProps) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: `linear-gradient(90deg, ${surf} 25%, ${bdr} 50%, ${surf} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'ea-shimmer 1.4s ease-in-out infinite',
      flexShrink: 0,
      ...style,
    }} />
  )
}

/** Pre-built card skeleton — matches standard EntryCard shape */
export function CardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div style={{
      background: '#F9F7F2', border: `1px solid ${bdr}`,
      borderRadius: 12, padding: '16px', marginBottom: 8,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton width={36} height={36} radius={9} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="55%" height={13} />
          <Skeleton width="35%" height={10} />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={10} width={`${70 - i * 15}%`} />
      ))}
    </div>
  )
}

/** Pre-built page header skeleton */
export function HeaderSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
      <Skeleton width={180} height={22} radius={6} />
      <Skeleton width={280} height={13} radius={4} />
    </div>
  )
}

/** Matches StatCard layout exactly */
export function StatCardSkeleton() {
  return (
    <div style={{
      background: '#F9F7F2', border: `1px solid ${bdr}`,
      borderRadius: 14, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <Skeleton width={36} height={36} radius={10} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="40%" height={26} />
        <Skeleton width="55%" height={10} />
        <Skeleton width="45%" height={10} />
      </div>
    </div>
  )
}

/** Matches a compact list row (pipeline entries, founder rows, messages) */
export function RowSkeleton({ withAvatar = true }: { withAvatar?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: `1px solid ${bdr}`,
    }}>
      {withAvatar && <Skeleton width={34} height={34} radius={999} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Skeleton width="42%" height={12} />
        <Skeleton width="58%" height={10} />
      </div>
      <Skeleton width={32} height={18} radius={999} />
    </div>
  )
}

"use client"

import { bg, ink } from '@/lib/constants/colors'

interface AvatarProps {
  url?: string | null
  name: string
  size: number
  radius: number
  fontSize?: number
  bgColor?: string
  fgColor?: string
}

export function Avatar({ url, name, size, radius, fontSize, bgColor, fgColor }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{
          width: size, height: size, borderRadius: radius,
          objectFit: 'cover', flexShrink: 0, display: 'block',
        }}
        onError={e => {
          // On broken image, hide the img and show initials via a sibling
          // Simplest: hide img, parent will need a fallback. We swap src to empty.
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: bgColor ?? ink, color: fgColor ?? bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fontSize ?? Math.round(size * 0.32), fontWeight: 700,
      letterSpacing: '-0.02em',
    }}>
      {initials}
    </div>
  )
}

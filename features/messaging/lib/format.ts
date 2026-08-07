// Was duplicated verbatim in both app/founder/messages/page.tsx and
// app/investor/messages/page.tsx — one copy now.

const AVATAR_PALETTES = [
  { bg: '#EDE9FE', color: '#6D28D9' },
  { bg: '#DBEAFE', color: '#1D4ED8' },
  { bg: '#D1FAE5', color: '#065F46' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#FCE7F3', color: '#9D174D' },
  { bg: '#E0F2FE', color: '#0369A1' },
  { bg: '#FEE2E2', color: '#991B1B' },
  { bg: '#F3F4F6', color: '#374151' },
]

export function avatarPalette(name: string): { bg: string; color: string } {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_PALETTES[h % AVATAR_PALETTES.length]
}

export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

/** Relative time for a list row / thread header ("2h ago", "Yesterday"). */
export function relDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

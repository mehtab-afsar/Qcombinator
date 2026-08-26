'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, ArrowRight, type LucideIcon } from 'lucide-react'
import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { bg, surf, bdr, ink, muted, blue, green, red, white } from '@/lib/constants/colors'
import { NOTIFICATION_REGISTRY, LEGACY_ICONS, isNotificationType } from '@/lib/notifications/registry'

export interface NotifItem {
  id: string
  type: string
  title: string
  body?: string
  time: string
  read: boolean
  metadata?: Record<string, unknown>
}

// Icon, accent color, and deep-link now come from one place: lib/notifications/registry.ts,
// shared with the writer that creates these rows. LEGACY_ICONS covers types with no live writer
// (mostly pre-ADR-034) so an old row still renders a real icon instead of the generic fallback.
function getAccent(type: string): string {
  return isNotificationType(type) ? NOTIFICATION_REGISTRY[type].color : muted
}

function getIcon(type: string): LucideIcon {
  if (isNotificationType(type)) return NOTIFICATION_REGISTRY[type].icon
  return LEGACY_ICONS[type] ?? Bell
}

/** metadata.href always wins (the writer knows the role-specific destination a generic type
 *  can't); the registry's deepLink is the fallback for rows that don't carry one. */
function getDeepLink(n: NotifItem): string | null {
  const explicit = n.metadata?.href
  if (typeof explicit === 'string') return explicit
  if (!isNotificationType(n.type)) return null
  return NOTIFICATION_REGISTRY[n.type].deepLink?.(n.metadata) ?? null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotifRow({ n, onViewStartup, onRead }: {
  n: NotifItem
  onViewStartup?: (id: string) => void
  /** Called when the row's link/action is actually used — the normal "opening it reads it"
   *  behavior, alongside the panel's existing bulk "mark all read". */
  onRead?: (id: string) => void
}) {
  const accent = getAccent(n.type)
  const Icon = getIcon(n.type)
  const founderId    = n.metadata?.founderId   as string | undefined
  const artifactType = n.metadata?.artifactType as string | undefined
  const fromAgent    = n.metadata?.fromAgent   as string | undefined
  const deepLink     = getDeepLink(n)
  // startup_share has an in-panel callback (opens a modal, doesn't navigate) that takes
  // priority over the generic Link when the caller provides one.
  const useCallback  = n.type === 'startup_share' && founderId && onViewStartup

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px',
      background: n.read ? 'transparent' : `${blue}04`,
      borderBottom: `1px solid ${bdr}`,
      transition: 'background .15s',
      cursor: 'default',
      position: 'relative',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = n.read ? surf : `${blue}06`)}
      onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : `${blue}04`)}
    >
      {/* unread dot */}
      {!n.read && (
        <div style={{
          position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
          width: 5, height: 5, borderRadius: '50%', background: blue, flexShrink: 0,
        }} />
      )}

      {/* icon container */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${accent}12`, border: `1px solid ${accent}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={accent} />
      </div>

      {/* text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: n.read ? 400 : 600, color: ink,
          margin: '0 0 2px', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {n.title}
        </p>
        {n.body && (
          <p style={{ fontSize: 12, color: muted, margin: '0 0 4px', lineHeight: 1.4, fontStyle: 'italic' }}>
            {n.body}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: muted }}>{timeAgo(n.time)}</span>

          {/* One deep-link pattern for every type, sourced from the registry (or metadata.href
              when the writer knows a role-specific destination a generic type can't) — every
              notification resolves somewhere now, not just the 3 types this used to hardcode. */}
          {useCallback ? (
            <button
              onClick={() => { onViewStartup!(founderId!); onRead?.(n.id) }}
              style={{
                fontSize: 11, fontWeight: 600, color: accent,
                background: `${accent}10`, border: `1px solid ${accent}25`,
                borderRadius: 999, padding: '2px 10px', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              View startup →
            </button>
          ) : deepLink && (
            <Link
              href={deepLink}
              onClick={() => onRead?.(n.id)}
              style={{
                fontSize: 11, fontWeight: 600, color: accent,
                background: `${accent}12`, border: `1px solid ${accent}40`,
                borderRadius: 999, padding: '2px 10px', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}
            >
              View <ArrowRight size={10} />
            </Link>
          )}

          {/* Triggered-by context — a legacy field from before ADR-034; still meaningful on any
              old agent_action row still in someone's inbox. */}
          {fromAgent && (
            <span style={{ fontSize: 10, color: muted, fontStyle: 'italic' }}>
              via {fromAgent}
            </span>
          )}
        </div>
        {/* Artifact type badge for autonomous actions */}
        {n.type === 'agent_action' && artifactType && (
          <span style={{
            display: 'inline-block', marginTop: 4,
            fontSize: 10, fontWeight: 600, color: green,
            background: `${green}12`, border: `1px solid ${green}30`,
            borderRadius: 999, padding: '1px 8px', textTransform: 'capitalize',
          }}>
            {artifactType.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── shared floating panel ────────────────────────────────────────────────────
export function NotificationDropdown({
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
  onViewStartup,
  onRead,
  footerHref,
}: {
  notifications: NotifItem[]
  unreadCount: number
  onClose: () => void
  onMarkAllRead: () => void
  onViewStartup?: (id: string) => void
  onRead?: (id: string) => void
  footerHref?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // slight delay so the opening click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', top: 56, right: 12, zIndex: 200,
        width: 380, maxHeight: 520,
        background: white, borderRadius: 16,
        border: `1px solid ${bdr}`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transformOrigin: 'top right',
      }}
    >
      {/* header */}
      <div style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: `1px solid ${bdr}`,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Notifications</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 500, color: blue,
                background: `${blue}08`, border: `1px solid ${blue}20`,
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${blue}14` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${blue}08` }}
            >
              <Check style={{ height: 11, width: 11 }} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: muted, transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = surf }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <X style={{ height: 13, width: 13 }} />
          </button>
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
              background: surf, border: `1px solid ${bdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={20} color={muted} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: '0 0 6px' }}>
              You&apos;re all caught up
            </p>
            <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.6 }}>
              New activity will appear here.
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <NotifRow key={n.id} n={n} onViewStartup={onViewStartup} onRead={onRead} />
          ))
        )}
      </div>

      {/* footer */}
      {footerHref && notifications.length > 0 && (
        <a
          href={footerHref}
          style={{
            display: 'block', padding: '12px 16px', textAlign: 'center',
            fontSize: 12, fontWeight: 600, color: blue,
            borderTop: `1px solid ${bdr}`, textDecoration: 'none',
            background: `${bg}`, transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = surf)}
          onMouseLeave={e => (e.currentTarget.style.background = bg)}
        >
          View all activity →
        </a>
      )}
    </motion.div>
  )
}

// ─── reusable bell button ─────────────────────────────────────────────────────
export function NotificationBellButton({
  open,
  unreadCount,
  onClick,
}: {
  open: boolean
  unreadCount: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', width: 36, height: 36, borderRadius: 10,
        background: open ? `${blue}10` : surf,
        border: `1px solid ${open ? blue : bdr}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .2s',
      }}
      onMouseEnter={e => { if (!open) { e.currentTarget.style.background = `${blue}06`; e.currentTarget.style.borderColor = `${blue}50` } }}
      onMouseLeave={e => { if (!open) { e.currentTarget.style.background = surf; e.currentTarget.style.borderColor = bdr } }}
    >
      <Bell style={{ height: 15, width: 15, color: open ? blue : muted, transition: 'color .2s' }} />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              position: 'absolute', top: -5, right: -5,
              minWidth: 17, height: 17, borderRadius: 999,
              background: red, color: white,
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
              border: `2px solid ${white}`,
              boxShadow: '0 1px 4px rgba(220,38,38,0.4)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

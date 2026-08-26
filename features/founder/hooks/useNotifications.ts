'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SidebarNotification } from '../types/founder.types'

type Notif = SidebarNotification & { read: boolean }

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [nextCursor,    setNextCursor]    = useState<string | null>(null)
  const [loadingMore,   setLoadingMore]   = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  async function load(unreadOnly = false) {
    try {
      const qs = unreadOnly ? '?unreadOnly=true' : ''
      const res = await fetch(`/api/notifications${qs}`)
      const { notifications: notifs, nextCursor } = await res.json() as { notifications: Notif[]; nextCursor: string | null }
      setNotifications(notifs ?? [])
      setUnreadCount((notifs ?? []).filter(n => !n.read).length)
      setNextCursor(nextCursor ?? null)
    } catch { /* non-critical */ }
  }

  /** Pages further back in time using the cursor the last page returned — the founder
   *  notifications page's "load more", not used by the bell dropdown. */
  async function loadMore(unreadOnly = false) {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const qs = new URLSearchParams({ before: nextCursor, ...(unreadOnly ? { unreadOnly: 'true' } : {}) })
      const res = await fetch(`/api/notifications?${qs.toString()}`)
      const { notifications: more, nextCursor: cursor } = await res.json() as { notifications: Notif[]; nextCursor: string | null }
      setNotifications(prev => [...prev, ...(more ?? [])])
      setNextCursor(cursor ?? null)
    } catch { /* non-critical */ } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    load()

    // Subscribe to new inserts on the notifications table for this user
    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch {
      return
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      channelRef.current = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as { id: string; type: string; title: string; body?: string; metadata?: Record<string, unknown>; created_at: string }
            const newNotif: Notif = {
              id:          row.id,
              agentId:     '',
              action_type: row.type,
              title:       row.title,
              body:        row.body,
              time:        row.created_at,
              read:        false,
              metadata:    row.metadata ?? {},
            }
            setNotifications(prev => [newNotif, ...prev])
            setUnreadCount(c => c + 1)
          }
        )
        .subscribe()
    })

    return () => {
      if (channelRef.current) {
        try { createClient().removeChannel(channelRef.current) } catch { /* ignore */ }
        channelRef.current = null
      }
    }
  }, [])

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    if (unreadIds.length > 0) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      }).catch(() => { /* non-critical */ })
    }
  }

  /** Marks one notification read — the normal "click a row to open it" behavior, alongside the
   *  existing bulk markAllRead. No-ops if it's already read, so a re-click never double-counts. */
  async function markRead(id: string) {
    const target = notifications.find(n => n.id === id)
    if (!target || target.read) return
    setUnreadCount(c => Math.max(0, c - 1))
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => { /* non-critical */ })
  }

  return {
    notifications, unreadCount, markAllRead, markRead,
    load, loadMore, hasMore: nextCursor !== null, loadingMore,
  }
}

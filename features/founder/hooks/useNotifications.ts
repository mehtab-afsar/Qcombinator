'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SidebarNotification } from '../types/founder.types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<SidebarNotification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/notifications')
      const { notifications: notifs } = await res.json() as { notifications: (SidebarNotification & { read?: boolean })[] }
      setNotifications(notifs ?? [])
      setUnreadCount((notifs ?? []).filter(n => !n.read).length)
    } catch { /* non-critical */ }
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
            const row = payload.new as { id: string; type: string; title: string; created_at: string }
            const newNotif: SidebarNotification = {
              id:          row.id,
              icon:        '🤖',
              agentId:     '',
              action_type: row.type,
              title:       row.title,
              time:        row.created_at,
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
    const unreadIds = notifications
      .filter((n) => !(n as SidebarNotification & { read?: boolean }).read)
      .map(n => n.id)
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

  return { notifications, unreadCount, markAllRead }
}

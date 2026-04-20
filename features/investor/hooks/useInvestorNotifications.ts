'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InvestorNotification {
  id: string
  icon: string
  type: string
  title: string
  time: string
  read: boolean
}

const TYPE_ICONS: Record<string, string> = {
  investor_view:  '👁️',
  qscore_update:  '📈',
  message:        '💬',
  agent_complete: '🤖',
  deal_flow:      '🔔',
}

export function useInvestorNotifications() {
  const [notifications, setNotifications] = useState<InvestorNotification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/notifications')
      const { notifications: rows } = await res.json() as { notifications: (InvestorNotification & { read?: boolean })[] }
      const notifs = rows ?? []
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch { /* non-critical */ }
  }

  useEffect(() => {
    load()

    let supabase: ReturnType<typeof createClient>
    try { supabase = createClient() } catch { return }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channelRef.current = supabase
        .channel(`investor_notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as { id: string; type: string; title: string; created_at: string }
            setNotifications(prev => [{
              id: row.id, type: row.type, title: row.title, time: row.created_at,
              icon: TYPE_ICONS[row.type] ?? '🔔', read: false,
            }, ...prev])
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
      }).catch(() => {})
    }
  }

  return { notifications, unreadCount, markAllRead }
}

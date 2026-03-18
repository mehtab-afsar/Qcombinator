'use client'

/**
 * useNotifications
 * Loads notifications and manages unread count via localStorage.
 */

import { useState, useEffect } from 'react'
import { fetchNotifications } from '../services/sidebar.service'
import { SidebarNotification } from '../types/founder.types'

const READ_KEY = 'ea_read_notifs_v1'

export function useNotifications() {
  const [notifications, setNotifications] = useState<SidebarNotification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)

  useEffect(() => {
    fetchNotifications()
      .then(notifs => {
        setNotifications(notifs)
        try {
          const readIds = new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'))
          setUnreadCount(notifs.filter(n => !readIds.has(n.id)).length)
        } catch {
          setUnreadCount(notifs.length)
        }
      })
      .catch(() => {})
  }, [])

  function markAllRead() {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(notifications.map(n => n.id)))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  return { notifications, unreadCount, markAllRead }
}

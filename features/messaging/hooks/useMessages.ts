'use client'

/**
 * useMessages
 * Manages real-time message loading and sending for an accepted conversation.
 */

import { useState, useEffect, useCallback } from 'react'
import { getCurrentUserId, fetchMessages, sendMessage } from '../services/messages.service'
import { Conversation, Message, RealMessage } from '../types/messaging.types'

export function useMessages(
  selected: Conversation | null,
  onMessageSent: (convId: string, body: string) => void,
) {
  const [realMessages, setRealMessages] = useState<RealMessage[]>([])
  const [myUserId,     setMyUserId]     = useState<string | null>(null)
  const [msgLoading,   setMsgLoading]   = useState(false)
  const [sending,      setSending]      = useState(false)

  // Resolve current user ID once (needed for message direction rendering)
  useEffect(() => {
    getCurrentUserId().then(setMyUserId)
  }, [])

  // Load real messages whenever the selected accepted conversation changes
  useEffect(() => {
    if (!selected?.connectionId) {
      setRealMessages([])
      return
    }
    const connId = selected.connectionId
    setMsgLoading(true)
    fetchMessages(connId)
      .then(msgs => setRealMessages(msgs))
      .catch(() => {})
      .finally(() => setMsgLoading(false))
  }, [selected?.connectionId])

  /**
   * Sends a message.
   * - If the conversation has a real connectionId → uses the API and persists.
   * - Otherwise (pending connection) → local-only optimistic update.
   */
  const handleSend = useCallback(async (
    body: string,
    currentSelected: Conversation,
    onLocalUpdate: (conv: Conversation) => void,
  ) => {
    if (!body.trim() || sending) return

    if (currentSelected.connectionId) {
      setSending(true)
      try {
        const sent = await sendMessage(currentSelected.connectionId, body)
        if (sent) {
          setRealMessages(prev => [...prev, sent])
          onMessageSent(currentSelected.id, body)
        }
      } catch (err) {
        console.error('Send message error:', err)
      } finally {
        setSending(false)
      }
      return
    }

    // Pending conversation: optimistic local update only
    const newMsg: Message = {
      id:        Date.now().toString(),
      content:   body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender:    'user',
      type:      'text',
    }
    const updatedConv: Conversation = {
      ...currentSelected,
      messages: [...currentSelected.messages, newMsg],
      lastMessage: body,
      timestamp: 'Just now',
    }
    onLocalUpdate(updatedConv)
    onMessageSent(currentSelected.id, body)
  }, [sending, onMessageSent])

  return {
    realMessages,
    setRealMessages,
    myUserId,
    msgLoading,
    sending,
    handleSend,
  }
}

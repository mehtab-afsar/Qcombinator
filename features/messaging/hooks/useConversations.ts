'use client'

/**
 * useConversations
 * Manages conversation list and connection request state.
 * Owns all data fetching and mutation logic for the left panel.
 */

import { useState, useEffect, useCallback } from 'react'
import { loadConnectionConversations } from '../services/messages.service'
import { Conversation, ConnectionRequest, Message } from '../types/messaging.types'

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [requests,      setRequests]      = useState<ConnectionRequest[]>([])

  // Load outgoing connection requests as conversations on mount
  useEffect(() => {
    loadConnectionConversations()
      .then(pendingConvs => {
        if (pendingConvs.length > 0) {
          setConversations(prev => {
            const existingIds = new Set(prev.map(c => c.id))
            return [...prev, ...pendingConvs.filter(c => !existingIds.has(c.id))]
          })
        }
      })
      .catch(err => console.error('Messages load error:', err))
  }, [])

  // Accept an incoming connection request
  const handleAccept = useCallback((reqId: string): Conversation | null => {
    const req = requests.find(r => r.id === reqId)
    if (!req) return null

    setRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: 'accepted' as const } : r
    ))

    const newConv: Conversation = {
      id: `c-${reqId}`,
      participant: req.from,
      requestId: reqId,
      lastMessage: 'Connection accepted — say hello!',
      timestamp: 'Just now',
      unread: 0,
      starred: false,
      messages: [
        {
          id: 'welcome',
          content: `You accepted ${req.from.name}'s connection request. You can now message each other directly.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: 'user',
          type: 'text',
        },
      ],
    }

    setConversations(prev => [newConv, ...prev])
    return newConv
  }, [requests])

  // Decline an incoming connection request
  const handleDecline = useCallback((reqId: string) => {
    setRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: 'declined' as const } : r
    ))
  }, [])

  // Confirm a meeting slot within a conversation
  const handleAcceptSlot = useCallback((convId: string, msgId: string, slot: string) => {
    const applyToMessages = (msgs: Message[]) =>
      msgs.map(msg =>
        msg.id === msgId
          ? { ...msg, meetingStatus: 'confirmed' as const, confirmedSlot: slot }
          : msg
      )

    setConversations(prev => prev.map(conv =>
      conv.id !== convId ? conv : { ...conv, messages: applyToMessages(conv.messages) }
    ))
  }, [])

  // Update the last-message preview when a message is sent
  const updateLastMessage = useCallback((convId: string, body: string) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, lastMessage: body, timestamp: 'Just now' } : c
    ))
  }, [])

  return {
    conversations,
    setConversations,
    requests,
    setRequests,
    handleAccept,
    handleDecline,
    handleAcceptSlot,
    updateLastMessage,
  }
}

/**
 * Messaging Service
 * All API and Supabase calls for the messaging feature.
 * No React, no UI — pure data access.
 */

import { Conversation, RealMessage, Participant } from '../types/messaging.types'

// ─── auth ──────────────────────────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

// ─── connections ───────────────────────────────────────────────────────────────

interface RawInvestor {
  id: string
  name: string
  firm: string
  title: string
}

interface ConnectionsApiResponse {
  connections: Record<string, string>
  connectionIds?: Record<string, string>
}

/**
 * Loads all outgoing connection requests and maps them to Conversation objects.
 * Merges data from /api/connections and /api/investors.
 */
export async function loadConnectionConversations(): Promise<Conversation[]> {
  const [connRes, invRes] = await Promise.all([
    fetch('/api/connections'),
    fetch('/api/investors'),
  ])

  if (!connRes.ok) return []

  const { connections, connectionIds = {} } = await connRes.json() as ConnectionsApiResponse
  const { investors: dbInvestors } = invRes.ok ? await invRes.json() : { investors: [] }

  const investorMap: Record<string, { name: string; firm: string; title: string }> = {}
  for (const inv of (dbInvestors ?? []) as RawInvestor[]) {
    investorMap[inv.id] = { name: inv.name, firm: inv.firm, title: inv.title }
  }

  return Object.entries(connections)
    .filter(([, status]) => status === 'pending' || status === 'meeting-scheduled')
    .map(([investorId, status]) => {
      const inv = investorMap[investorId]
      const isAccepted = status === 'meeting-scheduled'
      const participant: Participant = {
        id: investorId,
        name: inv?.name ?? 'Investor',
        title: inv?.title ?? 'Partner',
        company: inv?.firm ?? 'Venture Capital',
        type: 'investor',
      }
      const msgContent = isAccepted
        ? `${participant.name} from ${participant.company} accepted your connection request. You can now message each other directly.`
        : `Your connection request to ${participant.name} at ${participant.company} is pending. Once accepted you can message each other here.`

      return {
        id: `pending-${investorId}`,
        participant,
        requestId: investorId,
        connectionId: connectionIds[investorId],
        lastMessage: isAccepted ? `Connected with ${participant.name}` : 'Connection request sent',
        timestamp: 'Recently',
        unread: isAccepted ? 1 : 0,
        starred: false,
        messages: [
          {
            id: 'pending-msg',
            content: msgContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: 'user' as const,
            type: 'text' as const,
          },
        ],
      }
    })
}

// ─── messages ─────────────────────────────────────────────────────────────────

/**
 * Fetches real messages for an accepted connection.
 */
export async function fetchMessages(connectionId: string): Promise<RealMessage[]> {
  const res = await fetch(`/api/messages?connectionId=${connectionId}`)
  if (!res.ok) return []
  const data = await res.json()
  return (data?.messages as RealMessage[]) ?? []
}

/**
 * Sends a message to an accepted connection. Returns the persisted message.
 */
export async function sendMessage(connectionId: string, body: string): Promise<RealMessage | null> {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId, body }),
  })
  if (!res.ok) return null
  const { message } = await res.json()
  return message as RealMessage
}

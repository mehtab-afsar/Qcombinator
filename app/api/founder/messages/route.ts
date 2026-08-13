import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

interface ConnectionRow {
  id: string
  demo_investor_id: string | null
  investor_id: string | null
  requested_by: string | null
  personal_message: string | null
  status: string
  created_at: string
}

// requested_by is NULL on rows created before that column existed — fall back to the same
// assumption the UI made before it existed, so old threads keep rendering as they always did.
// Pending requests were only ever the founder's own outgoing ones (investor outreach always
// starts already-accepted); accepted threads' notes were always rendered as the OTHER party's.
function personalMessageFromMe(c: ConnectionRow, myUserId: string): boolean {
  if (c.requested_by) return c.requested_by === myUserId
  return c.status === 'pending'
}

// GET /api/founder/messages
// Mirrors GET /api/investor/messages, from the founder's side: returns the
// founder's own connection requests split into `requests` (still pending) and
// `conversations` (accepted, enriched with latest message + real unread count) —
// the data the founder Requests/Conversations tab split needs.
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = createAdminClient()

    const { data: connections, error: connErr } = await supabase
      .from('connection_requests')
      .select('id, demo_investor_id, investor_id, requested_by, personal_message, status, created_at')
      .eq('founder_id', user.id)
      .order('created_at', { ascending: false })

    if (connErr) {
      log.error('GET /api/founder/messages connections', { connErr })
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    // Same investor-name-dedup founders can end up with (demo + real row for the
    // same investor) — keep only the most recent, already-first since ordered DESC.
    const seen = new Set<string>()
    const deduped = ((connections ?? []) as ConnectionRow[]).filter(c => {
      const key = c.investor_id ?? c.demo_investor_id ?? c.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const demoIds = [...new Set(deduped.map(c => c.demo_investor_id).filter(Boolean))] as string[]
    const realIds = [...new Set(deduped.map(c => c.investor_id).filter(Boolean))] as string[]

    const [demoRes, realRes] = await Promise.all([
      demoIds.length > 0
        ? supabase.from('demo_investors').select('id, name, firm').in('id', demoIds)
        : Promise.resolve({ data: [] as { id: string; name: string; firm: string }[] }),
      realIds.length > 0
        ? supabase.from('investor_profiles').select('user_id, full_name, firm_name').in('user_id', realIds)
        : Promise.resolve({ data: [] as { user_id: string; full_name: string; firm_name: string }[] }),
    ])

    const demoMap = new Map((demoRes.data ?? []).map(i => [i.id, i]))
    const realMap = new Map((realRes.data ?? []).map(i => [i.user_id, { name: i.full_name, firm: i.firm_name }]))

    function investorNameFirm(c: ConnectionRow): { name: string; firm: string | null } {
      if (c.demo_investor_id) {
        const d = demoMap.get(c.demo_investor_id)
        return { name: d?.name ?? 'Investor', firm: d?.firm ?? null }
      }
      if (c.investor_id) {
        const r = realMap.get(c.investor_id)
        return { name: r?.name ?? 'Investor', firm: r?.firm ?? null }
      }
      return { name: 'Investor', firm: null }
    }

    const accepted = deduped.filter(c => c.status === 'meeting_scheduled' || c.status === 'accepted')
    const pending = deduped.filter(c => c.status === 'pending')

    const acceptedIds = accepted.map(c => c.id)
    const { data: allMessages } = acceptedIds.length > 0
      ? await supabase
          .from('messages')
          .select('id, connection_request_id, sender_id, body, read_at, created_at')
          .in('connection_request_id', acceptedIds)
          .order('created_at', { ascending: false })
      : { data: [] as { id: string; connection_request_id: string; sender_id: string; body: string; read_at: string | null; created_at: string }[] }

    const msgsByConnection = new Map<string, typeof allMessages>()
    for (const msg of allMessages ?? []) {
      const list = msgsByConnection.get(msg.connection_request_id) ?? []
      list.push(msg)
      msgsByConnection.set(msg.connection_request_id, list)
    }

    const requests = pending.map(c => {
      const { name, firm } = investorNameFirm(c)
      return {
        id: c.id,
        displayName: name,
        subtitle: firm ?? undefined,
        personalMessage: c.personal_message,
        personalMessageFromMe: personalMessageFromMe(c, user.id),
        status: c.status,
        createdAt: c.created_at,
      }
    })

    const conversationsOut = accepted.map(c => {
      const { name, firm } = investorNameFirm(c)
      const msgs = msgsByConnection.get(c.id) ?? []
      const latest = msgs[0] ?? null
      const unreadCount = msgs.filter(m => m.sender_id !== user.id && !m.read_at).length
      return {
        id: c.id,
        displayName: name,
        subtitle: firm ?? undefined,
        personalMessage: c.personal_message,
        personalMessageFromMe: personalMessageFromMe(c, user.id),
        status: c.status,
        createdAt: c.created_at,
        unreadCount,
        lastMessage: latest
          ? { body: latest.body, createdAt: latest.created_at, senderId: latest.sender_id }
          : null,
      }
    })

    return NextResponse.json({ requests, conversations: conversationsOut })
  } catch (err) {
    log.error('GET /api/founder/messages', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

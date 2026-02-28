import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/patel/enrich
// Body: { domain, hunterApiKey? }
// Searches Hunter.io for decision-maker emails at a given company domain
// Returns up to 10 leads with name, email, title, confidence

interface HunterEmail {
  value: string
  type: string
  confidence: number
  first_name?: string
  last_name?: string
  position?: string
  linkedin?: string
  verification?: { status: string }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domain, hunterApiKey } = await request.json()
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'domain is required (e.g. "acme.com")' }, { status: 400 })
    }

    // Use provided key or fall back to env var
    const apiKey = hunterApiKey?.trim() || process.env.HUNTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Hunter API key required — get one free at hunter.io' }, { status: 400 })
    }

    const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*/,'').trim()

    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(cleanDomain)}&limit=10&api_key=${apiKey}`,
      { method: 'GET' }
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({})) as { errors?: { details: string }[] }
      const msg = errData.errors?.[0]?.details ?? `Hunter API error: ${res.status}`
      return NextResponse.json({ error: msg }, { status: res.status === 401 ? 400 : 500 })
    }

    const data = await res.json() as {
      data?: {
        organization?: string
        domain?: string
        emails?: HunterEmail[]
      }
      meta?: { results: number; limit: number }
    }

    const emails = data.data?.emails ?? []
    const leads = emails
      .filter(e => e.value && e.confidence >= 50)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .map(e => ({
        name: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.value.split('@')[0],
        email: e.value,
        title: e.position || null,
        confidence: e.confidence,
        linkedin: e.linkedin || null,
      }))

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'patel',
        action_type: 'lead_enrichment',
        description: `Hunter.io enrichment for ${cleanDomain} — ${leads.length} leads found`,
        metadata: { domain: cleanDomain, leadCount: leads.length, organization: data.data?.organization },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      domain: cleanDomain,
      organization: data.data?.organization ?? cleanDomain,
      leads,
      total: data.meta?.results ?? leads.length,
    })
  } catch (err) {
    console.error('Patel enrich error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

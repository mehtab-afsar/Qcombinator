import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET    /api/agents/atlas/track       — list tracked competitors (with lazy scraping)
// POST   /api/agents/atlas/track       — add a competitor
// DELETE /api/agents/atlas/track?id=x  — remove a competitor

const PRICE_KEYWORDS = /pricing|price|plan|per month|\/mo|\/year|billed|subscribe|free|pro|enterprise|starter|tier/i

interface CompetitorRow {
  id: string
  user_id: string
  name: string
  url: string | null
  last_scraped_at: string | null
  last_price_data: Record<string, unknown> | null
  created_at: string
}

function normalizePrices(raw: string[]): string[] {
  return [...new Set(raw.map(p => p.replace(/,/g, '')))].sort()
}

function pricesChanged(oldPrices: string[], newPrices: string[]): boolean {
  if (oldPrices.length === 0) return false // First scrape, no baseline to compare against
  const oldSet = new Set(normalizePrices(oldPrices))
  const newSet = new Set(normalizePrices(newPrices))
  if (oldSet.size !== newSet.size) return true
  for (const p of newSet) { if (!oldSet.has(p)) return true }
  return false
}

async function scrapeCompetitorPricing(
  competitorId: string,
  url: string,
  userId: string,
  competitorName: string,
  previousPriceData: Record<string, unknown> | null
) {
  try {
    const pricingUrl = `${url.replace(/\/$/, '')}/pricing`
    const res = await fetch(pricingUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EdgeAlpha/1.0)' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return

    const text = await res.text()
    const truncated = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)

    // Extract price signals with regex
    const dollarMatches = truncated.match(/\$[\d,]+(?:\.\d{1,2})?/g) ?? []
    const hasKeywords = PRICE_KEYWORDS.test(truncated)

    const summary = [
      hasKeywords ? 'Pricing page found.' : 'No clear pricing page.',
      dollarMatches.length > 0
        ? `Price signals: ${[...new Set(dollarMatches)].slice(0, 5).join(', ')}.`
        : 'No dollar amounts detected.',
      `Content preview: ${truncated.slice(0, 300)}...`,
    ].join(' ')

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const newPriceData = { summary, prices: dollarMatches.slice(0, 10), scraped_url: pricingUrl }

    await adminClient
      .from('tracked_competitors')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_price_data: newPriceData,
      })
      .eq('id', competitorId)

    // Detect pricing changes vs previous scrape
    const oldPrices = (previousPriceData?.prices as string[] | undefined) ?? []
    const newPrices = dollarMatches.slice(0, 10)
    if (pricesChanged(oldPrices, newPrices)) {
      const added   = newPrices.filter(p => !oldPrices.includes(p))
      const removed = oldPrices.filter(p => !newPrices.includes(p))
      await adminClient.from('agent_activity').insert({
        user_id:     userId,
        agent_id:    'atlas',
        action_type: 'price_change_alert',
        description: `${competitorName} changed pricing — was: ${oldPrices.slice(0, 4).join(', ') || 'none'} → now: ${newPrices.slice(0, 4).join(', ') || 'none'}`,
        metadata: {
          competitor_id: competitorId,
          competitor_name: competitorName,
          old_prices: oldPrices,
          new_prices: newPrices,
          added,
          removed,
          pricing_url: pricingUrl,
        },
      })
    }
  } catch (err) {
    console.error(`Scrape failed for competitor ${competitorId}:`, err)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('tracked_competitors')
      .select('id, name, url, last_scraped_at, last_price_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 })
    }

    const competitors = (data ?? []) as CompetitorRow[]

    // Fire and forget scraping for stale competitors (don't block response)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    for (const comp of competitors) {
      if (!comp.url) continue
      const needsScrape =
        !comp.last_scraped_at || new Date(comp.last_scraped_at) < sevenDaysAgo
      if (needsScrape) {
        // Fire and forget — intentionally not awaited
        scrapeCompetitorPricing(comp.id, comp.url, user.id, comp.name, comp.last_price_data).catch(console.error)
      }
    }

    return NextResponse.json({ competitors })
  } catch (err) {
    console.error('Atlas track GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, url } = body as { name: string; url?: string }

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tracked_competitors')
      .insert({
        user_id: user.id,
        name,
        url: url ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add competitor' }, { status: 500 })
    }

    // Log to agent_activity
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'atlas',
      action_type: 'track_competitor',
      description: `Started tracking competitor: ${name}`,
      metadata: { competitor_id: data?.id, name, url: url ?? null },
    })

    return NextResponse.json({ competitor: data })
  } catch (err) {
    console.error('Atlas track POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('tracked_competitors')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Atlas track DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

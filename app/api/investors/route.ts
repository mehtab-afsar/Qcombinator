import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

// GET /api/investors
// Returns a merged list of real investor_profiles (onboarded users) and
// demo_investors (seeded mock data). Real investors appear first.
// Each row is normalised to the same shape; type='real'|'demo' lets the
// matching page know which FK to use when creating a connection_request.
export async function GET() {
  try {
    const supabase = createAdminClient()

    const [{ data: demoRows, error: demoErr }, { data: realRows, error: realErr }] =
      await Promise.all([
        supabase
          .from('demo_investors')
          .select('id, name, firm, title, location, check_sizes, stages, sectors, geography, thesis, portfolio, response_rate')
          .eq('is_active', true)
          .order('response_rate', { ascending: false }),
        supabase
          .from('investor_profiles')
          .select('user_id, full_name, firm_name, title, sectors, stages, check_sizes, geography, thesis')
          .eq('onboarding_completed', true),
      ])

    if (demoErr) log.error('GET /api/investors demo', { demoErr })
    if (realErr) log.error('GET /api/investors real', { realErr })

    type DemoRow = {
      id: string; name: string; firm: string; title: string | null; location: string | null;
      check_sizes: string[] | null; stages: string[] | null; sectors: string[] | null;
      geography: string[] | null; thesis: string | null; portfolio: string[] | null;
      response_rate: number;
    }
    type RealRow = {
      user_id: string; full_name: string | null; firm_name: string | null; title: string | null;
      sectors: string[] | null; stages: string[] | null; check_sizes: string[] | null;
      geography: string[] | null; thesis: string | null;
    }

    const demoNormalised = ((demoRows ?? []) as DemoRow[]).map(r => ({
      id: r.id,
      type: 'demo' as const,
      name: r.name ?? 'Investor',
      firm: r.firm ?? '',
      title: r.title ?? '',
      location: r.location ?? '',
      sectors: r.sectors ?? [],
      stages: r.stages ?? [],
      check_sizes: r.check_sizes ?? [],
      geography: r.geography ?? [],
      thesis: r.thesis ?? '',
      portfolio: r.portfolio ?? [],
      response_rate: r.response_rate ?? 70,
    }))

    const realNormalised = ((realRows ?? []) as RealRow[])
      .filter(r => r.full_name || r.firm_name)
      .map(r => ({
        id: r.user_id,
        type: 'real' as const,
        name: r.full_name ?? r.firm_name ?? 'Investor',
        firm: r.firm_name ?? '',
        title: r.title ?? 'Investor',
        location: (r.geography ?? [])[0] ?? '',
        sectors: r.sectors ?? [],
        stages: r.stages ?? [],
        check_sizes: r.check_sizes ?? [],
        geography: r.geography ?? [],
        thesis: r.thesis ?? '',
        portfolio: [] as string[],
        response_rate: 80,
      }))

    return NextResponse.json(
      { investors: [...realNormalised, ...demoNormalised] },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    )
  } catch (err) {
    log.error('GET /api/investors', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

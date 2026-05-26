import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

// GET /api/invites/validate?token=<uuid>
// Public — no auth required. Returns enough info to render the invite landing page.

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: company, error } = await supabase
      .from('investor_portfolio_companies')
      .select('company_name, founder_name, invite_status, investor_user_id')
      .eq('invite_token', token)
      .single()

    if (error || !company) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    if (company.invite_status === 'accepted') {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
    }

    // Fetch investor display name
    const { data: investor } = await supabase
      .from('investor_profiles')
      .select('full_name, firm_name')
      .eq('user_id', company.investor_user_id)
      .single()

    return NextResponse.json({
      valid: true,
      companyName:  company.company_name,
      founderName:  company.founder_name,
      investorName: investor?.full_name ?? null,
      firmName:     investor?.firm_name ?? null,
    })
  } catch (err) {
    log.error('GET /api/invites/validate', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

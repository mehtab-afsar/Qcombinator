import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET  /api/investor/portfolio-companies  → list all portfolio companies for investor
// POST /api/investor/portfolio-companies  → add a single company

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investor_portfolio_companies')
      .select('*')
      .eq('investor_user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('GET /api/investor/portfolio-companies', { error })
      return NextResponse.json({ error: 'Failed to load portfolio companies' }, { status: 500 })
    }

    return NextResponse.json({ companies: data ?? [] })
  } catch (err) {
    log.error('GET /api/investor/portfolio-companies', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await req.json()
    const { company_name, founder_name, founder_email, sector, stage, invested_at, investment_note } = body

    if (!company_name?.trim()) {
      return NextResponse.json({ error: 'company_name is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investor_portfolio_companies')
      .insert({
        investor_user_id: auth.user.id,
        company_name: company_name.trim(),
        founder_name: founder_name?.trim() || null,
        founder_email: founder_email?.trim().toLowerCase() || null,
        sector: sector || null,
        stage: stage || null,
        invested_at: invested_at || null,
        investment_note: investment_note?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      log.error('POST /api/investor/portfolio-companies', { error })
      return NextResponse.json({ error: 'Failed to add company' }, { status: 500 })
    }

    return NextResponse.json({ company: data }, { status: 201 })
  } catch (err) {
    log.error('POST /api/investor/portfolio-companies', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

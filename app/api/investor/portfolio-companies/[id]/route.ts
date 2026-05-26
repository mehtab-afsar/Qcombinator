import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// PATCH  /api/investor/portfolio-companies/[id]  → update company details
// DELETE /api/investor/portfolio-companies/[id]  → remove (does NOT delete founder account)

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    const body = await req.json()
    const { company_name, founder_name, founder_email, sector, stage, invested_at, investment_note } = body

    const updates: Record<string, string | null> = {}
    if (company_name !== undefined) updates.company_name = company_name?.trim() || null
    if (founder_name !== undefined) updates.founder_name = founder_name?.trim() || null
    if (founder_email !== undefined) updates.founder_email = founder_email?.trim().toLowerCase() || null
    if (sector !== undefined) updates.sector = sector || null
    if (stage !== undefined) updates.stage = stage || null
    if (invested_at !== undefined) updates.invested_at = invested_at || null
    if (investment_note !== undefined) updates.investment_note = investment_note?.trim() || null

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('investor_portfolio_companies')
      .update(updates)
      .eq('id', id)
      .eq('investor_user_id', auth.user.id)
      .select()
      .single()

    if (error) {
      log.error('PATCH /api/investor/portfolio-companies/[id]', { error })
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    return NextResponse.json({ company: data })
  } catch (err) {
    log.error('PATCH /api/investor/portfolio-companies/[id]', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await params

    const supabase = await createClient()
    const { error } = await supabase
      .from('investor_portfolio_companies')
      .delete()
      .eq('id', id)
      .eq('investor_user_id', auth.user.id)

    if (error) {
      log.error('DELETE /api/investor/portfolio-companies/[id]', { error })
      return NextResponse.json({ error: 'Failed to remove company' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('DELETE /api/investor/portfolio-companies/[id]', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { sendPortfolioInviteEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'

// POST /api/investor/portfolio-companies/invite
// Body: { companyId: string }
// Sends (or resends) the invite email for a single portfolio company

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { companyId } = await req.json()
    if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 })

    const supabase = await createClient()

    // Fetch company + investor profile in parallel
    const [companyRes, investorRes] = await Promise.all([
      supabase
        .from('investor_portfolio_companies')
        .select('*')
        .eq('id', companyId)
        .eq('investor_user_id', auth.user.id)
        .single(),
      supabase
        .from('investor_profiles')
        .select('full_name, firm_name')
        .eq('user_id', auth.user.id)
        .single(),
    ])

    if (companyRes.error || !companyRes.data) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const company = companyRes.data
    const investor = investorRes.data

    if (!company.founder_email) {
      return NextResponse.json({ error: 'No founder email set for this company' }, { status: 400 })
    }

    if (company.invite_status === 'accepted') {
      return NextResponse.json({ error: 'Founder has already joined' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai'
    const inviteUrl = `${appUrl}/founder/join?token=${company.invite_token}`

    await sendPortfolioInviteEmail({
      to:           company.founder_email,
      investorName: investor?.full_name ?? 'Your investor',
      firmName:     investor?.firm_name ?? '',
      companyName:  company.company_name,
      inviteUrl,
    })

    // Update status to pending
    await supabase
      .from('investor_portfolio_companies')
      .update({ invite_status: 'pending', invite_sent_at: new Date().toISOString() })
      .eq('id', companyId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('POST /api/investor/portfolio-companies/invite', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

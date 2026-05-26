import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { sendPortfolioInviteEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'

// POST /api/investor/portfolio-companies/bulk-invite
// Sends invites to all companies with invite_status = 'not_sent' that have a founder_email

export async function POST() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = await createClient()

    const [companiesRes, investorRes] = await Promise.all([
      supabase
        .from('investor_portfolio_companies')
        .select('id, company_name, founder_email, invite_token, invite_status')
        .eq('investor_user_id', auth.user.id)
        .eq('invite_status', 'not_sent')
        .not('founder_email', 'is', null),
      supabase
        .from('investor_profiles')
        .select('full_name, firm_name')
        .eq('user_id', auth.user.id)
        .single(),
    ])

    if (companiesRes.error) {
      return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 })
    }

    const companies = companiesRes.data ?? []
    const investor  = investorRes.data
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai'

    let sent = 0
    let failed = 0

    for (const company of companies) {
      try {
        await sendPortfolioInviteEmail({
          to:           company.founder_email!,
          investorName: investor?.full_name ?? 'Your investor',
          firmName:     investor?.firm_name ?? '',
          companyName:  company.company_name,
          inviteUrl:    `${appUrl}/founder/join?token=${company.invite_token}`,
        })

        await supabase
          .from('investor_portfolio_companies')
          .update({ invite_status: 'pending', invite_sent_at: new Date().toISOString() })
          .eq('id', company.id)

        sent++
      } catch {
        failed++
        log.error('bulk-invite: failed for company', { id: company.id })
      }
    }

    return NextResponse.json({ sent, failed, total: companies.length })
  } catch (err) {
    log.error('POST /api/investor/portfolio-companies/bulk-invite', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

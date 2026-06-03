/**
 * GET /api/founder/billing/invoices
 * Returns the last 12 Stripe invoices for the authenticated founder.
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('founder_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] })
    }

    const invoices = await getStripe().invoices.list({
      customer: profile.stripe_customer_id as string,
      limit:    12,
    })

    const items = invoices.data.map(inv => ({
      id:          inv.id,
      number:      inv.number,
      status:      inv.status,
      amount:      inv.amount_paid,
      currency:    inv.currency,
      date:        inv.created,
      pdfUrl:      inv.invoice_pdf,
      hostedUrl:   inv.hosted_invoice_url,
      description: inv.lines.data[0]?.description ?? 'Subscription',
    }))

    return NextResponse.json({ invoices: items })
  } catch (err) {
    log.error('GET /api/founder/billing/invoices', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

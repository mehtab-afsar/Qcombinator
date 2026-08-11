/**
 * F13 — Stripe, the FOURTH Connector: revenue verification via Stripe Connect OAuth.
 *
 * Replaces the founder pasting a restricted key with a real "Connect with Stripe" flow — same
 * OAuth shape as Gmail/Slack, using `lib/connectors/{stripe-oauth,oauth-provider,grants,vault}`
 * unchanged. See `stripe-oauth.ts`'s docstring for how Stripe's auth model differs from
 * Google's/Slack's (no separate client secret; our own platform secret key authenticates the
 * token exchange).
 *
 * ⚠️ SCOPE OF THIS FILE, ON PURPOSE. `send()` is not meaningful here (there's nothing to send)
 * and honestly refuses, same shape as `gmail-read.ts`. The real capability —
 * `syncStripeMetrics()` — pulls subscriptions/customers/charges and computes MRR/ARR, exactly the
 * calculation `app/api/stripe/connect/route.ts`'s restricted-key flow already proved correct;
 * this is a MOVE of that logic onto a real OAuth credential, not a rewrite. `onConnected()` is the
 * one generic hook (`types.ts`) that triggers it automatically right after a founder connects, so
 * the founder doesn't have to take a second action to see their numbers.
 *
 * ⚠️ NOT MCP. Stripe's official MCP server (`mcp.stripe.com`) bundles write tools
 * (`create_refund`, `cancel_subscription`, `stripe_api_write`) alongside reads — unlike Gmail's
 * read-only server, there's no read-only-only surface to point at. The three calls this file
 * needs (list subscriptions, list customers, list charges) are simple and already proven as plain
 * REST; using MCP here would only add a shared client that COULD be pointed at a tool that moves
 * money, for no benefit. Same reasoning `gmail.ts` (send) uses for staying hand-written.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'
import type { Connector, ConnectorOutcome, ConnectorRequest, ResolvedGrant } from '../types'

const DEAUTHORIZE_URL = 'https://connect.stripe.com/oauth/deauthorize'
const API_BASE = 'https://api.stripe.com/v1'

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export interface StripeMetrics {
  mrr: number
  arr: number
  customers: number
  last30: number
  totalCustomers: number | undefined
}

/**
 * Pull live revenue metrics for the connected account and persist them.
 *
 * Ported from `app/api/stripe/connect/route.ts`'s POST handler — same MRR/ARR calculation, same
 * `founder_profiles` columns, same self-report cross-validation, same Signal Strength
 * recalculation, so the dashboard banner, admin metrics and investor deal-flow (all of which read
 * those columns already) keep working unchanged. The only thing that changed is the credential:
 * `grant.accessToken` (from a real OAuth connection) instead of a pasted restricted key — used
 * identically, `Authorization: Bearer {token}`, since a Stripe Connect Standard OAuth access
 * token authenticates AS the connected account directly (no separate `Stripe-Account` header
 * needed, unlike Express/Custom accounts).
 */
export async function syncStripeMetrics(grant: ResolvedGrant): Promise<StripeMetrics> {
  const headers = { Authorization: `Bearer ${grant.accessToken}`, 'Stripe-Version': '2024-06-20' }

  const [subscriptionsRes, customersRes] = await Promise.all([
    fetch(`${API_BASE}/subscriptions?status=active&limit=100&expand[]=data.plan`, { headers }),
    fetch(`${API_BASE}/customers?limit=1`, { headers }),
  ])

  if (!subscriptionsRes.ok) {
    const errData = await subscriptionsRes.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(errData.error?.message ?? 'Stripe API error reading subscriptions')
  }

  const subsData = await subscriptionsRes.json() as {
    data: Array<{
      items: {
        data: Array<{
          plan?: { amount?: number; interval?: string }
          price?: { unit_amount?: number; recurring?: { interval?: string } }
        }>
      }
    }>
  }
  const custData = customersRes.ok
    ? await customersRes.json() as { total_count?: number }
    : { total_count: undefined }

  let monthlyRevenue = 0
  const activeSubs = subsData.data ?? []
  for (const sub of activeSubs) {
    for (const item of sub.items?.data ?? []) {
      const amount = item.price?.unit_amount ?? item.plan?.amount ?? 0
      const interval = item.price?.recurring?.interval ?? item.plan?.interval ?? 'month'
      monthlyRevenue += interval === 'year' ? amount / 12 : amount
    }
  }

  const mrr = Math.round(monthlyRevenue / 100)
  const arr = mrr * 12
  const customers = activeSubs.length

  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  const chargesRes = await fetch(
    `${API_BASE}/charges?created[gte]=${thirtyDaysAgo}&limit=100&status=succeeded`,
    { headers },
  )
  let last30 = 0
  if (chargesRes.ok) {
    const chargesData = await chargesRes.json() as { data: Array<{ amount: number }> }
    last30 = Math.round((chargesData.data ?? []).reduce((sum, c) => sum + (c.amount ?? 0), 0) / 100)
  }

  const admin = adminClient()

  const { error: updateError } = await admin
    .from('founder_profiles')
    .update({
      stripe_verified: true,
      stripe_verified_at: new Date().toISOString(),
      stripe_mrr: mrr,
      stripe_arr: arr,
      stripe_customers: customers,
      stripe_last30: last30,
      stripe_account_id: grant.accountEmail, // the real connected account id (acct_...), not the old 'connected' marker
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', grant.founderId)
  if (updateError) throw new Error(`Failed to save verified metrics: ${updateError.message}`)

  // Cross-validate against the most recent self-reported assessment — same 30%-delta rule as
  // the restricted-key flow.
  const { data: latestScore } = await admin
    .from('qscore_history')
    .select('assessment_data, id, ai_actions')
    .eq('user_id', grant.founderId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  let deltaFlagCount = 0
  if (latestScore?.assessment_data) {
    const assessed = latestScore.assessment_data as { financial?: { mrr?: number } }
    const reportedMrr = assessed?.financial?.mrr ?? 0
    if (reportedMrr > 0 && mrr > 0) {
      const delta = Math.abs(mrr - reportedMrr) / mrr
      if (delta > 0.30) {
        deltaFlagCount = 1
        const existing = (latestScore.ai_actions as Record<string, unknown>) ?? {}
        const existingFlags = (existing.bluff_flags as unknown[] | undefined) ?? []
        await admin.from('qscore_history').update({
          ai_actions: {
            ...existing,
            bluff_flags: [...existingFlags, {
              field: 'financial.mrr', signal: 'stripe_self_report_delta',
              severity: delta > 0.60 ? 'high' : 'medium',
              description: `Self-reported MRR ($${reportedMrr.toLocaleString()}) differs from Stripe-verified MRR ($${mrr.toLocaleString()}) by ${Math.round(delta * 100)}%`,
              detected_at: new Date().toISOString(),
            }],
          },
        }).eq('id', latestScore.id)
      }
    }
  }

  // Recalculate Signal Strength now that Stripe is connected.
  const { calculateSignalStrength, calculateIntegrityIndex } = await import(
    '@/features/qscore/services/signal-strength'
  )
  const latestAssessment = (latestScore?.assessment_data ?? {}) as Record<string, unknown>
  const signalStrength = calculateSignalStrength(latestAssessment, true /* stripeConnected */)
  const integrityIndex = calculateIntegrityIndex(deltaFlagCount, latestScore?.id ? 1 : 0)
  await admin.from('founder_profiles')
    .update({ signal_strength: signalStrength, integrity_index: integrityIndex })
    .eq('user_id', grant.founderId)

  return { mrr, arr, customers, last30, totalCustomers: custData.total_count }
}

export const stripeConnector: Connector = {
  provider: 'stripe',
  scopes: ['read_only'],

  async send(_grant: ResolvedGrant, _request: ConnectorRequest): Promise<ConnectorOutcome> {
    return { status: 'rejected', reason: 'this connection only reads Stripe metrics, it cannot send' }
  },

  async reconcile(): Promise<boolean | null> {
    return null
  },

  async revoke(grant: ResolvedGrant): Promise<void> {
    const res = await fetch(DEAUTHORIZE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${process.env.STRIPE_SECRET_KEY ?? ''}:`).toString('base64')}`,
      },
      body: new URLSearchParams({
        client_id: process.env.STRIPE_CONNECT_CLIENT_ID ?? '',
        stripe_user_id: grant.accountEmail ?? '',
      }),
    })
    if (!res.ok) {
      throw new Error(`stripe revoke failed with ${res.status}`)
    }
  },

  async onConnected(grant: ResolvedGrant): Promise<void> {
    // Best-effort, and never throws back to the caller: the connection itself already succeeded
    // by the time this runs, and a sync hiccup shouldn't make the founder think connecting
    // failed. A retry surface (re-sync button) is a UI concern, not this hook's job.
    try {
      await syncStripeMetrics(grant)
    } catch (err) {
      log.error('stripe onConnected sync failed', { err })
    }
  },
}

/**
 * `getStripeMetricsContext` — the founder's own verified revenue reaching their own executives
 * for the first time (ADR-038, docs/AGI_ACTIONS_PRD.md).
 *
 * Two properties carry real weight here:
 *
 *  1. **Unverified never renders.** Everything downstream treats what lands in Company Context as
 *     fact — that is the entire reason this field is supposed to outrank self-reported figures.
 *     An unverified number reaching a prompt would invert that.
 *  2. **Context, never a trigger.** `lib/rhythm/delta.ts` must stay free of Stripe. A signal there
 *     flips `hasNewInput` and would make revenue movement *cause* asset regeneration, which is
 *     ADR-028's genuinely decided territory. The last describe block is how that line stays
 *     uncrossed.
 *
 * fakeAdmin mirrors __tests__/contacts-context.test.ts's hand-rolled chainable rather than
 * jest.mock'ing Supabase — same convention, same reason.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripeMetricsContext } from '@/lib/connectors/context'

const VERIFIED = {
  stripe_verified: true,
  stripe_mrr: 12_500,
  stripe_arr: 150_000,
  stripe_customers: 42,
  stripe_last30: 13_100,
  stripe_verified_at: '2026-08-20T09:00:00Z',
}

function fakeAdmin(result: { data?: unknown; error?: { message: string } | null }): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: result.data ?? null, error: result.error ?? null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

describe('a connected, verified Stripe account', () => {
  it('renders every figure it has', async () => {
    const text = await getStripeMetricsContext(fakeAdmin({ data: VERIFIED }), 'f1')

    expect(text).toContain('Monthly recurring revenue: $12,500')
    expect(text).toContain('Annual recurring revenue: $150,000')
    expect(text).toContain('Paying customers: 42')
    expect(text).toContain('Collected in the last 30 days: $13,100')
  })

  it('states the trust level, so the model outranks self-reported numbers with it', async () => {
    const text = await getStripeMetricsContext(fakeAdmin({ data: VERIFIED }), 'f1')

    expect(text).toMatch(/verified payment data, not/i)
    expect(text).toMatch(/never contradict them/i)
  })

  it('dates the figures, so stale data reads as stale', async () => {
    const text = await getStripeMetricsContext(fakeAdmin({ data: VERIFIED }), 'f1')
    expect(text).toContain('Last synced: 2026-08-20')
  })

  it('renders only the figures it actually has', async () => {
    const text = await getStripeMetricsContext(
      fakeAdmin({ data: { ...VERIFIED, stripe_arr: null, stripe_last30: null } }),
      'f1',
    )
    expect(text).toContain('Monthly recurring revenue')
    expect(text).not.toContain('Annual recurring revenue')
    expect(text).not.toContain('last 30 days')
  })
})

describe('nothing unverified ever reaches a prompt', () => {
  it('returns null when Stripe is connected but never verified', async () => {
    // The load-bearing case. A figure that landed without a real sync must not present as fact.
    const text = await getStripeMetricsContext(
      fakeAdmin({ data: { ...VERIFIED, stripe_verified: false } }),
      'f1',
    )
    expect(text).toBeNull()
  })

  it('returns null when verification is simply absent', async () => {
    const text = await getStripeMetricsContext(
      fakeAdmin({ data: { ...VERIFIED, stripe_verified: null } }),
      'f1',
    )
    expect(text).toBeNull()
  })

  it('returns null when verified but there are no figures yet', async () => {
    // A real state — a connected account with no revenue. But an empty section reads as a gap
    // rather than a zero, so say nothing instead of rendering a heading with no facts under it.
    const text = await getStripeMetricsContext(
      fakeAdmin({ data: { stripe_verified: true, stripe_mrr: null, stripe_arr: null,
        stripe_customers: null, stripe_last30: null, stripe_verified_at: null } }),
      'f1',
    )
    expect(text).toBeNull()
  })
})

describe('a metrics lookup never breaks a cycle', () => {
  it('returns null, not a throw, on a query error', async () => {
    await expect(
      getStripeMetricsContext(fakeAdmin({ error: { message: 'db down' } }), 'f1'),
    ).resolves.toBeNull()
  })

  it('returns null when the founder has no profile row at all', async () => {
    await expect(getStripeMetricsContext(fakeAdmin({ data: null }), 'f1')).resolves.toBeNull()
  })
})

describe('this is context, never a trigger — the ADR-028 line', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

  it('the cycle delta digest contains no Stripe signal', () => {
    // ⚠️ ADR-028's DECIDED territory: a cycle is fed by a founder-activity delta, and an asset
    // with no new input is not regenerated. Adding Stripe to delta.ts would flip `hasNewInput`
    // and make revenue movement *cause* regeneration — a different decision entirely from
    // letting an asset that is being generated anyway see real numbers. If this test ever fails,
    // that line has been crossed and it needs its own ADR, not a passing build.
    expect(read('lib/rhythm/delta.ts').toLowerCase()).not.toContain('stripe')
  })

  it('reads the database, never Stripe itself — a cycle makes no external call for this', () => {
    // Why ADR-026's "no Connectors inside a cycle" is not engaged: the numbers were synced at
    // connect time. Nothing here contacts Stripe, so a cycle costs nothing and does not care
    // whether Stripe is up.
    const src = read('lib/connectors/context.ts')
    expect(src).toContain("from('founder_profiles')")
    expect(src).not.toContain('api.stripe.com')
    expect(src).not.toContain('fetch(')
  })
})

/**
 * Billing integration test — checkout → webhook → DB.
 *
 * The verified Phase 0 gap: nothing exercised the money path. No test touched
 * lib/stripe.ts, the webhook route, processed_webhook_events or
 * subscription_usage — and subscription_usage had a correctness fix as recently
 * as 20260616000001 with nothing guarding it. Roadmap Phase 0; Featureinventory
 * F18; EDGE_ALPHA_PRD.md §13.4 ("Billing untested — has broken production
 * before").
 *
 * Drives the real POST handler with Stripe and Supabase mocked, so the assertions
 * cover the actual route: signature check → dedup → handler → DB writes.
 *
 * The load-bearing case is idempotency (CLAUDE.md §4): Stripe retries on any
 * non-2xx, and a replayed event must never double-apply.
 */

import type Stripe from 'stripe'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockConstructEvent = jest.fn()
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
}))

jest.mock('@/lib/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }))
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('@/lib/analytics', () => ({
  trackUpgradedToPremium: jest.fn(),
  trackChurned: jest.fn(),
}))

/** Records every write so tests can assert what reached the database. */
type Write = { table: string; op: 'upsert' | 'update'; payload: Record<string, unknown>; filters: Record<string, unknown> }

let writes: Write[] = []
/** event_id -> already seen. Mirrors the unique index on processed_webhook_events. */
let processedEvents: Set<string>
/** Rows returned by .maybeSingle()/.single(), keyed by table. */
let selectResults: Record<string, unknown>
let dedupShouldError = false

function makeQuery(table: string) {
  const filters: Record<string, unknown> = {}

  const query: Record<string, unknown> = {
    upsert: (payload: Record<string, unknown>, opts?: { ignoreDuplicates?: boolean }) => {
      // processed_webhook_events is the dedup gate: ON CONFLICT DO NOTHING, so a
      // duplicate event_id yields count 0.
      if (table === 'processed_webhook_events') {
        if (dedupShouldError) return Promise.resolve({ error: { message: 'dedup boom' }, count: null })
        const id = payload.event_id as string
        if (processedEvents.has(id) && opts?.ignoreDuplicates) {
          return Promise.resolve({ error: null, count: 0 })
        }
        processedEvents.add(id)
        return Promise.resolve({ error: null, count: 1 })
      }
      writes.push({ table, op: 'upsert', payload, filters })
      return Promise.resolve({ error: null, count: 1 })
    },
    update: (payload: Record<string, unknown>) => {
      const chain: Record<string, unknown> = {
        eq: (col: string, val: unknown) => { filters[col] = val; return chain },
        then: (resolve: (v: unknown) => unknown) => {
          writes.push({ table, op: 'update', payload, filters })
          return Promise.resolve({ error: null }).then(resolve)
        },
      }
      return chain
    },
    select: () => query,
    eq: (col: string, val: unknown) => { filters[col] = val; return query },
    in: () => query,
    limit: () => query,
    maybeSingle: () => Promise.resolve({ data: selectResults[table] ?? null, error: null }),
    single: () => Promise.resolve({ data: selectResults[table] ?? null, error: null }),
  }
  return query
}

jest.mock('@/lib/supabase/server', () => ({
  createTypedAdminClient: () => ({ from: (table: string) => makeQuery(table) }),
}))

import { POST } from '@/app/api/webhooks/stripe/route'
import { FOUNDER_PLAN_LIMITS, INVESTOR_PRO_LIMITS, UNLIMITED } from '@/lib/billing/plans'

// ── Helpers ───────────────────────────────────────────────────────────────────

function request(body = '{}', signature: string | null = 'sig_valid'): Request {
  return new Request('https://example.com/api/webhooks/stripe', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {},
    body,
  })
}

function checkoutEvent(id: string, metadata: Record<string, string>, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        metadata,
        customer: 'cus_123',
        subscription: 'sub_123',
        ...overrides,
      },
    },
  } as unknown as Stripe.Event
}

const writesTo = (table: string) => writes.filter(w => w.table === table)
const usageFor = (feature: string) =>
  writesTo('subscription_usage').find(w => w.payload.feature === feature || w.filters.feature === feature)

beforeEach(() => {
  writes = []
  processedEvents = new Set()
  selectResults = {}
  dedupShouldError = false
  jest.clearAllMocks()
})

// ── Signature verification ────────────────────────────────────────────────────

describe('signature verification — fail closed', () => {
  it('rejects a request with no stripe-signature header', async () => {
    const res = await POST(request('{}', null) as never)
    expect(res.status).toBe(400)
    expect(writes).toHaveLength(0)
  })

  it('rejects a forged signature and writes nothing', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature') })

    const res = await POST(request('{}', 'sig_forged') as never)
    expect(res.status).toBe(400)
    expect(writes).toHaveLength(0)
  })
})

// ── Founder upgrade ───────────────────────────────────────────────────────────

describe('checkout.session.completed — founder upgrade', () => {
  it('marks the profile premium and stores the Stripe ids', async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent('evt_1', { user_id: 'user_1', userType: 'founder' }))

    const res = await POST(request() as never)
    expect(res.status).toBe(200)

    const profile = writesTo('founder_profiles')[0]
    expect(profile.payload).toMatchObject({
      subscription_tier:      'premium',
      subscription_status:    'active',
      stripe_customer_id:     'cus_123',
      stripe_subscription_id: 'sub_123',
    })
    expect(profile.filters).toEqual({ user_id: 'user_1' })
  })

  it('writes the premium limits that production expects', async () => {
    mockConstructEvent.mockReturnValue(checkoutEvent('evt_2', { user_id: 'user_1', userType: 'founder' }))
    await POST(request() as never)

    // LITERALS ON PURPOSE. Asserting against FOUNDER_PLAN_LIMITS would be
    // circular — the route reads the same constant, so both sides move together
    // and a silent downgrade of every paying founder would pass. (Verified by
    // mutation: 500 -> 50 in the constant did not fail this test until the
    // literals went in.) These numbers are the contract with the live database;
    // changing one should require changing this line, deliberately.
    expect(usageFor('agent_chat')!.payload.limit_count).toBe(500)
    expect(usageFor('qscore_recalc')!.payload.limit_count).toBe(999_999)
    expect(usageFor('investor_connection')!.payload.limit_count).toBe(999_999)
  })

  it('keeps the single source wired to the route', async () => {
    // Complements the literals above: that test pins the values, this one proves
    // the route still reads them from lib/billing/plans.ts rather than
    // re-hardcoding its own copy.
    mockConstructEvent.mockReturnValue(checkoutEvent('evt_2b', { user_id: 'user_1', userType: 'founder' }))
    await POST(request() as never)

    expect(usageFor('agent_chat')!.payload.limit_count).toBe(FOUNDER_PLAN_LIMITS.premium.agent_chat)
    expect(usageFor('qscore_recalc')!.payload.limit_count).toBe(FOUNDER_PLAN_LIMITS.premium.qscore_recalc)
  })

  it('never writes null for an unlimited feature', async () => {
    // Regression guard. increment_usage_if_allowed does COALESCE(limit_count, 50)
    // (20260512000003:48) — a NULL limit throttles a PAYING founder to the free
    // cap. The UNLIMITED sentinel must reach the DB as a number.
    mockConstructEvent.mockReturnValue(checkoutEvent('evt_3', { user_id: 'user_1', userType: 'founder' }))
    await POST(request() as never)

    for (const write of writesTo('subscription_usage')) {
      expect(write.payload.limit_count).not.toBeNull()
      expect(typeof write.payload.limit_count).toBe('number')
    }
    expect(usageFor('qscore_recalc')!.payload.limit_count).toBe(UNLIMITED)
  })
})

// ── Investor upgrade ──────────────────────────────────────────────────────────

describe('checkout.session.completed — investor upgrade', () => {
  it('routes to investor_profiles when userType is absent', async () => {
    // Investors do not set userType — the absence IS the routing signal.
    mockConstructEvent.mockReturnValue(checkoutEvent('evt_4', { user_id: 'inv_1' }))

    const res = await POST(request() as never)
    expect(res.status).toBe(200)

    expect(writesTo('founder_profiles')).toHaveLength(0)
    expect(writesTo('investor_profiles')[0].payload).toMatchObject({
      subscription_tier:   'pro',
      subscription_status: 'active',
    })
    expect(usageFor('investor_connection')!.payload.limit_count).toBe(INVESTOR_PRO_LIMITS.investor_connection)
  })
})

// ── Idempotency — the one that matters ────────────────────────────────────────

describe('idempotency — a Stripe retry must not double-apply', () => {
  it('processes an event once and deduplicates the replay', async () => {
    const event = checkoutEvent('evt_dup', { user_id: 'user_1', userType: 'founder' })
    mockConstructEvent.mockReturnValue(event)

    const first = await POST(request() as never)
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ received: true })
    const writesAfterFirst = writes.length
    expect(writesAfterFirst).toBeGreaterThan(0)

    // Same event.id — exactly what Stripe sends when it retries.
    const second = await POST(request() as never)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ received: true, deduplicated: true })

    // The crux: the replay wrote nothing.
    expect(writes).toHaveLength(writesAfterFirst)
  })

  it('fails closed when the dedup gate itself errors', async () => {
    // If we cannot prove the event is new, we must not process it — a 500 makes
    // Stripe retry rather than risk a double-apply.
    mockConstructEvent.mockReturnValue(checkoutEvent('evt_5', { user_id: 'user_1', userType: 'founder' }))
    dedupShouldError = true

    const res = await POST(request() as never)
    expect(res.status).toBe(500)
    expect(writes).toHaveLength(0)
  })
})

// ── Malformed input ───────────────────────────────────────────────────────────

describe('malformed session', () => {
  it('acks a session with no metadata instead of looping Stripe retries', async () => {
    // A retry cannot add missing metadata, so 200 is correct — 500 would make
    // Stripe retry a permanently broken event for days.
    mockConstructEvent.mockReturnValue(checkoutEvent('evt_6', {}))

    const res = await POST(request() as never)
    expect(res.status).toBe(200)
    expect(writesTo('founder_profiles')).toHaveLength(0)
    expect(writesTo('investor_profiles')).toHaveLength(0)
    expect(writesTo('subscription_usage')).toHaveLength(0)
  })

  it('acks a session missing its subscription id', async () => {
    mockConstructEvent.mockReturnValue(
      checkoutEvent('evt_7', { user_id: 'user_1', userType: 'founder' }, { subscription: null }),
    )

    const res = await POST(request() as never)
    expect(res.status).toBe(200)
    expect(writesTo('founder_profiles')).toHaveLength(0)
  })
})

// ── Cancellation ──────────────────────────────────────────────────────────────

describe('customer.subscription.deleted — downgrade', () => {
  it('downgrades a founder and resets limits to the free tier', async () => {
    selectResults = { investor_profiles: null, founder_profiles: { user_id: 'user_1' } }
    mockConstructEvent.mockReturnValue({
      id: 'evt_8',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123' } },
    } as unknown as Stripe.Event)

    const res = await POST(request() as never)
    expect(res.status).toBe(200)

    expect(writesTo('founder_profiles')[0].payload).toMatchObject({
      subscription_tier:   'free',
      subscription_status: 'canceled',
    })

    // Literals — see the note on the premium case above.
    expect(usageFor('agent_chat')!.payload.limit_count).toBe(50)
    expect(usageFor('qscore_recalc')!.payload.limit_count).toBe(2)
    expect(usageFor('investor_connection')!.payload.limit_count).toBe(3)
  })

  it('downgrades an investor without touching founder_profiles', async () => {
    selectResults = { investor_profiles: { user_id: 'inv_1' } }
    mockConstructEvent.mockReturnValue({
      id: 'evt_9',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123' } },
    } as unknown as Stripe.Event)

    await POST(request() as never)

    expect(writesTo('investor_profiles')[0].payload).toMatchObject({
      subscription_tier:   'free',
      subscription_status: 'canceled',
    })
    expect(writesTo('founder_profiles')).toHaveLength(0)
  })
})

// ── Unknown events ────────────────────────────────────────────────────────────

describe('unhandled event types', () => {
  it('acks without writing', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_10',
      type: 'invoice.payment_succeeded',
      data: { object: {} },
    } as unknown as Stripe.Event)

    const res = await POST(request() as never)
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(0)
  })
})

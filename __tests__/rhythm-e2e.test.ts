/**
 * Story 2 — UNMOCKED end-to-end cycle. The test the mocked suite couldn't be: real Registry,
 * Composer, F11 persistence, F12 generation, F10 orchestration, and a real (local) database.
 * The ONLY thing stubbed is the LLM call itself.
 *
 * It would have caught B1 (briefings 100% broken) without anyone knowing B1 existed: with the
 * bug, generateBriefing throws on every cycle, runCycle returns status 'failed', and the
 * "a briefing row exists" assertion fails.
 *
 * Runs only when LOCAL_TEST_DB_URL + LOCAL_TEST_DB_KEY point at a local Supabase whose new-model
 * schema is applied (migrations 01/02/03 + 06/07/08/09). SKIPS otherwise, so CI — which has no
 * database (FU-003) — never sees a false green from it.
 *
 *   Setup once:  psql "$LOCAL_DB" -f <story-2 migrations>   (or supabase db reset once fixed)
 *   Run:         LOCAL_TEST_DB_URL=… LOCAL_TEST_DB_KEY=… ANTHROPIC…unset  npx jest rhythm-e2e
 */

import { execSync } from 'child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getProgram } from '@/lib/registry'

// Stub ONLY the LLM. Every other module is the real thing.
// Briefings call routedText; assets call routedCall (since the truncation-guard fix needs
// stopReason, which only the structured call surfaces) — both must be stubbed or whichever
// path isn't gets a real "not a function" crash instead of a real behavioral test.
jest.mock('@/lib/llm/router', () => ({
  routedText: jest.fn(async (_tier: string, msgs: Array<{ content: string }>) => {
    const prompt = String(msgs?.[0]?.content ?? '')
    if (prompt.includes('Executive Briefing')) {
      return 'Briefing prose.\n\n```json\n{"verdict":"E2E: on track","summary":"stub","sections":[]}\n```'
    }
    return '# Asset (e2e)\n\nDeterministic content from the stubbed model.'
  }),
  routedCall: jest.fn(async () => ({
    text: '# Asset (e2e)\n\nDeterministic content from the stubbed model.',
    toolCall: null,
    stopReason: 'end_turn',
  })),
}))

const URL = process.env.LOCAL_TEST_DB_URL
const KEY = process.env.LOCAL_TEST_DB_KEY
const gate = URL && KEY ? describe : describe.skip

const STRATEGY = 'e2e00000-0000-0000-0000-0000000000a1'
const CONTRACT = 'e2e00000-0000-0000-0000-0000000000c1'
const PROGRAM = 'e2e00000-0000-0000-0000-0000000000d1'

/** Local Postgres, for the one thing REST can't reach: seeding auth.users (the FK root). */
const PG = process.env.LOCAL_TEST_DB_PG ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const psql = (sql: string): void => {
  execSync(`psql "${PG}" -q -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql.replace(/\s+/g, ' ').trim())}`)
}

gate('Story 2 end-to-end cycle (real DB, only the LLM stubbed)', () => {
  let admin: SupabaseClient
  const FOUNDER = 'e2e00000-0000-0000-0000-00000000f001' // a REAL auth.users row, seeded below

  beforeAll(async () => {
    admin = createClient(URL!, KEY!, { auth: { persistSession: false } })

    // founder_profiles FKs auth.users(id), so seed a real auth row first (the standard
    // local-seed shape; this CLI's GoTrue admin API rejects the new-style secret keys).
    psql(`DELETE FROM auth.users WHERE id = '${FOUNDER}'`) // cascades all prior e2e data
    psql(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token)
          VALUES ('00000000-0000-0000-0000-000000000000', '${FOUNDER}', 'authenticated',
            'authenticated', 'e2e-rhythm@test.local', '', now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')`)

    await admin.from('founder_profiles').insert({
      user_id: FOUNDER, full_name: 'E2E Founder', company_name: 'E2E Co', role: 'founder',
    })
    await admin.from('strategy_sessions').insert({
      id: STRATEGY, founder_id: FOUNDER, version: 1, is_current: true,
      mission: 'E2E mission', priorities: ['a'], goals: ['b'],
    })
    await admin.from('executive_contracts').insert({
      id: CONTRACT, founder_id: FOUNDER, strategy_id: STRATEGY, epoch: 1, version: 1,
      is_current: true, status: 'confirmed', priorities: ['a'], success_metrics: ['m'],
      responsibilities: [{ executive: 'growth', mandate: 'GTM' }], active_programs: ['P001'],
      confirmed_at: new Date().toISOString(),
    })
    await admin.from('programs').insert({
      id: PROGRAM, contract_id: CONTRACT, founder_id: FOUNDER, template_id: 'P001',
      owner: 'growth', objective: 'GTM', success_metric: 'm', status: 'active',
    })
  })

  afterAll(() => {
    psql(`DELETE FROM auth.users WHERE id = '${FOUNDER}'`) // cascades everything
  })

  it('runs a full cycle: assets persisted AND a briefing produced', async () => {
    const { runCycle } = await import('@/lib/rhythm/run')

    const result = await runCycle(admin, { founderId: FOUNDER, cycleKey: 'e2e-' + Date.now() })

    // With B1 unfixed this is 'failed' (the briefing throws) — the assertion that catches it.
    expect(result.status).toBe('completed')

    const { data: assets } = await admin
      .from('asset_versions').select('*').eq('founder_id', FOUNDER).eq('execution_id', result.runId)
    expect(assets?.length).toBe(getProgram('P001').assets.length) // every P001 asset regenerated

    const { data: briefings } = await admin
      .from('executive_briefings').select('*').eq('execution_id', result.runId)
    expect(briefings?.length).toBe(1)
    expect(briefings![0].verdict).toBeTruthy()
    expect(briefings![0].program_id).toBe(PROGRAM) // the UUID, not 'P001' (B1)
  }, 30_000)

  it('cycle 2 with NO founder activity: assets skipped, the no-change briefing is REACHED', async () => {
    // DEFECT CLASS — "passing test on unreachable code". The unit suite proved the no-change
    // briefing works when called; nothing proved the engine could ever call it (pre-ADR-028 it
    // regenerated unconditionally, so the path was decorative). This test crosses the real
    // seam: a second cycle with zero new founder signal must SKIP regeneration and land the
    // 'No material change' briefing through the actual engine.
    const { runCycle } = await import('@/lib/rhythm/run')

    // Cycle 1 (fresh key) populates the assets; mark it completed so it opens cycle 2's window.
    const first = await runCycle(admin, { founderId: FOUNDER, cycleKey: 'e2e2a-' + Date.now() })
    expect(first.status).toBe('completed')

    // Cycle 2: the founder did nothing in between.
    const second = await runCycle(admin, { founderId: FOUNDER, cycleKey: 'e2e2b-' + Date.now() })
    expect(second.status).toBe('completed')
    expect(second.stages.P001.assets).toBe('skipped') // no regeneration, no LLM asset spend

    const { data: newAssets } = await admin
      .from('asset_versions').select('id').eq('execution_id', second.runId)
    expect(newAssets?.length).toBe(0) // nothing rewritten from unchanged inputs

    const { data: briefings } = await admin
      .from('executive_briefings').select('verdict').eq('execution_id', second.runId)
    expect(briefings?.length).toBe(1)
    expect(briefings![0].verdict).toMatch(/no material change/i) // the once-unreachable path, reached
  }, 60_000)
})

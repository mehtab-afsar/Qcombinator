/**
 * THE cross-tenant test: founder B must not be able to read founder A's data.
 *
 * This is the single most important security property in the product, and until now nothing
 * could fail a build over it. The existing guards each prove something narrower:
 *   - `rls-policies.test.ts` parses migration SQL — proves the policies are WRITTEN correctly.
 *   - `e2e/security/rls-idor-tests.spec.ts` drives the real UI — but needs a built app, a
 *     running server and a browser, so it runs `continue-on-error` and cannot fail CI.
 *
 * Neither actually asks Postgres. This does: two real founders, two real user-scoped clients,
 * and a direct question — can B see A's rows? It needs only a database, so it runs in seconds
 * and can be BLOCKING.
 *
 * ⚠️ It uses ANON-KEY clients carrying each founder's JWT, exactly as the browser does. A
 * service-role client would bypass RLS and make this test pass while proving nothing — that
 * mistake would be invisible, which is why it is called out here.
 */

import { execSync } from 'child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isFounderVisible } from '@/lib/investor/visibility'

const URL = process.env.LOCAL_TEST_DB_URL
const ANON = process.env.LOCAL_TEST_DB_ANON_KEY
const SERVICE = process.env.LOCAL_TEST_DB_KEY

/**
 * A skipped security test is indistinguishable from a passing one on a CI dashboard. When
 * REQUIRE_DB_TESTS is set (CI does set it), a missing database is a FAILURE rather than a
 * silent skip — otherwise one typo'd secret would quietly retire this whole guard.
 */
const REQUIRED = process.env.REQUIRE_DB_TESTS === '1'
const configured = Boolean(URL && ANON && SERVICE)

if (REQUIRED && !configured) {
  throw new Error(
    'REQUIRE_DB_TESTS=1 but LOCAL_TEST_DB_URL / LOCAL_TEST_DB_ANON_KEY / LOCAL_TEST_DB_KEY are ' +
    'not all set. The cross-tenant security test must not silently skip in CI.',
  )
}

const gate = configured ? describe : describe.skip

const PG = process.env.LOCAL_TEST_DB_PG ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const psql = (sql: string): void => {
  execSync(`psql "${PG}" -q -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql.replace(/\s+/g, ' ').trim())}`)
}

const A = 'aaaa0000-0000-4000-8000-00000000000a'
const B = 'bbbb0000-0000-4000-8000-00000000000b'

/** Seed a founder with one row in every founder-scoped new-model table. */
function seedFounder(id: string, tag: string): void {
  psql(`DELETE FROM auth.users WHERE id = '${id}'`)
  psql(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated',
          '${tag}@tenancy.test', crypt('TenancyTest123!', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')`)
  psql(`INSERT INTO founder_profiles (user_id, full_name, company_name, role)
        VALUES ('${id}', '${tag} Founder', '${tag} Co', 'founder')`)
  psql(`INSERT INTO strategy_sessions (id, founder_id, version, is_current, mission, priorities, goals)
        VALUES (gen_random_uuid(), '${id}', 1, true, '${tag} SECRET MISSION',
          '["${tag} priority"]'::jsonb, '["${tag} goal"]'::jsonb)`)
  psql(`INSERT INTO executive_contracts (id, founder_id, strategy_id, epoch, version, is_current,
          status, priorities, success_metrics, responsibilities, active_programs, confirmed_at)
        SELECT gen_random_uuid(), '${id}', s.id, 1, 1, true, 'confirmed',
          '["${tag} priority"]'::jsonb, '["${tag} metric"]'::jsonb,
          '[{"executive":"growth","mandate":"GTM"}]'::jsonb, '["P001"]'::jsonb, now()
        FROM strategy_sessions s WHERE s.founder_id = '${id}'`)
  // authored_by='founder' on purpose: the schema requires execution_id to be NULL exactly when
  // the author is the founder (asset_versions_execution_matches_author), and a founder edit
  // needs no run to exist.
  psql(`INSERT INTO asset_versions (founder_id, asset_id, version, is_current, content,
          authored_by, executive_id)
        VALUES ('${id}', 'AS001', 1, true, '"${tag} CONFIDENTIAL ICP"'::jsonb, 'founder', 'growth')`)
}

/** A client that behaves exactly like that founder's browser: anon key + their own JWT. */
async function clientFor(email: string): Promise<SupabaseClient> {
  const anon = createClient(URL!, ANON!, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.signInWithPassword({ email, password: 'TenancyTest123!' })
  if (error || !data.session) throw new Error(`Could not sign in ${email}: ${error?.message}`)
  return createClient(URL!, ANON!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
}

gate('cross-tenant isolation — founder B cannot read founder A', () => {
  let asB: SupabaseClient

  beforeAll(async () => {
    seedFounder(A, 'alpha')
    seedFounder(B, 'bravo')
    asB = await clientFor('bravo@tenancy.test')
  }, 60_000)

  afterAll(() => {
    psql(`DELETE FROM auth.users WHERE id IN ('${A}', '${B}')`) // cascades everything
  })

  // Every founder-scoped table in the new model. Table-driven so a NEW table added without
  // founder scoping shows up here as a missing case rather than as a silent gap.
  const TABLES = [
    'strategy_sessions',
    'executive_contracts',
    'asset_versions',
  ] as const

  it.each(TABLES)('B reads ZERO of A\'s rows from %s', async table => {
    const { data, error } = await asB.from(table).select('*').eq('founder_id', A)

    // RLS returns an empty set rather than an error — "no rows" IS the enforcement.
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('B sees only its OWN rows when reading unfiltered', async () => {
    // The stronger question: not "is A hidden when I ask for A", but "what do I get when I
    // ask for everything". A missing WHERE clause in a policy shows up here, not above.
    const { data, error } = await asB.from('asset_versions').select('founder_id')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)          // B genuinely has data — not a vacuous pass
    expect([...new Set(data!.map(r => r.founder_id))]).toEqual([B])
  })

  it('A\'s secret content never appears in anything B can read', async () => {
    // Content-level check: catches a leak through a join or a view that a founder_id filter
    // would miss entirely. Matches on ALPHA's marker specifically — an earlier version looked
    // for a word both founders shared, so B seeing its OWN row failed the test.
    const { data } = await asB.from('asset_versions').select('content')
    const visible = JSON.stringify(data)
    expect(visible).not.toContain('alpha CONFIDENTIAL')
    expect(visible).toContain('bravo CONFIDENTIAL') // B's own row IS readable — not a vacuous pass
  })

  it('B cannot WRITE a row owned by A', async () => {
    const { error } = await asB.from('strategy_sessions').insert({
      founder_id: A, version: 99, is_current: false, mission: 'forged by bravo',
      priorities: [], goals: [],
    })
    expect(error).not.toBeNull() // the INSERT policy's WITH CHECK must reject this
  })

  it('the seed is real — a service-role client CAN see A (proving the test is not vacuous)', async () => {
    // If seeding silently failed, every assertion above would pass against an empty database
    // and this guard would be theatre. This is the control.
    const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })
    const { data } = await admin.from('asset_versions').select('founder_id').eq('founder_id', A)
    expect(data!.length).toBeGreaterThan(0)
  })
})

/**
 * Extension 1 (docs/INVESTOR_PHASE0_REMEDIATION.md) — same shape as the founder-side suite
 * above, applied to investor-owned tables. Mechanical: copy the pattern, new fixture data,
 * same assertions. Zero investor tables were covered before this — see docs/INVESTOR_AUDIT.md.
 */

const IA = 'ccccc000-0000-4000-8000-00000000000c'
const IB = 'ddddd000-0000-4000-8000-00000000000d'
// A single shared "founder" row that both test investors' rows point at. Isolation here is
// scoped by investor ownership, not by which founder is referenced — one dummy founder is
// enough for every investor table's (investor_id, founder_id) pair.
const SHARED_FOUNDER = 'eeeee000-0000-4000-8000-00000000000e'

function seedSharedFounder(): void {
  psql(`DELETE FROM auth.users WHERE id = '${SHARED_FOUNDER}'`)
  psql(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('00000000-0000-0000-0000-000000000000', '${SHARED_FOUNDER}', 'authenticated',
          'authenticated', 'shared-founder@tenancy.test', crypt('TenancyTest123!', gen_salt('bf')),
          now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')`)
}

/** Seed an investor with one row in every investor-owned table this extension covers. */
function seedInvestor(id: string, tag: string): void {
  psql(`DELETE FROM auth.users WHERE id = '${id}'`)
  psql(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated',
          '${tag}@tenancy.test', crypt('TenancyTest123!', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')`)
  psql(`INSERT INTO investor_profiles (user_id, full_name, email)
        VALUES ('${id}', '${tag} Investor', '${tag}@tenancy.test')`)
  psql(`INSERT INTO investor_pipeline (investor_user_id, founder_user_id, stage, notes)
        VALUES ('${id}', '${SHARED_FOUNDER}', 'watching', '${tag} SECRET NOTE')`)
  psql(`INSERT INTO investor_watchlist (investor_id, founder_id, threshold_qscore)
        VALUES ('${id}', '${SHARED_FOUNDER}', 70)`)
  psql(`INSERT INTO investor_portfolio_companies (investor_user_id, founder_user_id, company_name)
        VALUES ('${id}', '${SHARED_FOUNDER}', '${tag} CONFIDENTIAL CO')`)
  psql(`INSERT INTO investor_parameter_weights (investor_user_id)
        VALUES ('${id}')`)
}

gate('investor-vs-investor isolation — investor B cannot read investor A', () => {
  let asB: SupabaseClient

  beforeAll(async () => {
    seedSharedFounder()
    seedInvestor(IA, 'alpha-inv')
    seedInvestor(IB, 'bravo-inv')
    asB = await clientFor('bravo-inv@tenancy.test')
  }, 60_000)

  afterAll(() => {
    psql(`DELETE FROM auth.users WHERE id IN ('${IA}', '${IB}', '${SHARED_FOUNDER}')`) // cascades everything
  })

  // Table-driven so a NEW investor table added without ownership scoping shows up here as a
  // missing case rather than a silent gap — same rationale as the founder TABLES list above.
  const OWNER_COLUMN: Record<string, string> = {
    investor_pipeline:            'investor_user_id',
    investor_watchlist:           'investor_id',
    investor_portfolio_companies: 'investor_user_id',
    investor_parameter_weights:   'investor_user_id',
  }

  it.each(Object.keys(OWNER_COLUMN))('B reads ZERO of A\'s rows from %s', async table => {
    const { data, error } = await asB.from(table).select('*').eq(OWNER_COLUMN[table], IA)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('B sees only its OWN rows when reading investor_pipeline unfiltered', async () => {
    const { data, error } = await asB.from('investor_pipeline').select('investor_user_id')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    expect([...new Set(data!.map(r => r.investor_user_id))]).toEqual([IB])
  })

  it('A\'s confidential portfolio note never appears in anything B can read', async () => {
    const { data } = await asB.from('investor_portfolio_companies').select('company_name')
    const visible = JSON.stringify(data)
    expect(visible).not.toContain('alpha-inv CONFIDENTIAL')
    expect(visible).toContain('bravo-inv CONFIDENTIAL') // B's own row IS readable — not vacuous
  })

  it('B cannot WRITE a row owned by A', async () => {
    const { error } = await asB.from('investor_watchlist').insert({
      investor_id: IA, founder_id: SHARED_FOUNDER, threshold_qscore: 99,
    })
    expect(error).not.toBeNull() // the INSERT policy's WITH CHECK must reject this
  })

  it('the seed is real — a service-role client CAN see A (proving the test is not vacuous)', async () => {
    const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })
    const { data } = await admin.from('investor_pipeline').select('investor_user_id').eq('investor_user_id', IA)
    expect(data!.length).toBeGreaterThan(0)
  })
})

/**
 * Extension 2 (docs/INVESTOR_PHASE0_REMEDIATION.md) — the H-1 regression guard.
 *
 * This is NOT the same shape as the tests above. H-1 (docs/INVESTOR_AUDIT.md §2) was an
 * APPLICATION-layer gap, not an RLS gap: founder_profiles.visibility_gated has no RLS policy
 * of its own — it's a moderation flag that investor routes must check explicitly via
 * isFounderVisible(). A raw-table RLS assertion here would be vacuous (there is no policy to
 * test). This exercises the actual shared function all 5+ fixed routes call, against a real
 * seeded row — so a future revert of the H-1 fix (or a silent rename of the column) fails CI.
 *
 * This directly replaces the false-confidence mock in __tests__/rls.test.ts, whose comment
 * claimed this route was "fixed" while testing a stand-in function, never the real gate.
 */
const GATED_FOUNDER = 'fffff000-0000-4000-8000-00000000000f'
const VISIBLE_FOUNDER = 'aaaaa111-0000-4000-8000-000000000011'

gate('H-1 regression guard — visibility_gated founders are hidden from direct-access routes', () => {
  beforeAll(() => {
    for (const id of [GATED_FOUNDER, VISIBLE_FOUNDER]) {
      psql(`DELETE FROM auth.users WHERE id = '${id}'`)
      psql(`INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
              email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
              confirmation_token, email_change, email_change_token_new, recovery_token)
            VALUES ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated',
              'authenticated', '${id}@tenancy.test', crypt('TenancyTest123!', gen_salt('bf')),
              now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')`)
    }
    psql(`INSERT INTO founder_profiles (user_id, full_name, company_name, role, visibility_gated)
          VALUES ('${GATED_FOUNDER}', 'Gated Founder', 'Gated Co', 'founder', true)`)
    psql(`INSERT INTO founder_profiles (user_id, full_name, company_name, role, visibility_gated)
          VALUES ('${VISIBLE_FOUNDER}', 'Visible Founder', 'Visible Co', 'founder', false)`)
  }, 60_000)

  afterAll(() => {
    psql(`DELETE FROM auth.users WHERE id IN ('${GATED_FOUNDER}', '${VISIBLE_FOUNDER}')`)
  })

  it('isFounderVisible returns false for a gated founder', async () => {
    const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await isFounderVisible(admin as any, GATED_FOUNDER)).toBe(false)
  })

  it('isFounderVisible returns true for a visible founder (not vacuous)', async () => {
    const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await isFounderVisible(admin as any, VISIBLE_FOUNDER)).toBe(true)
  })

  it('isFounderVisible returns false for a founder that does not exist', async () => {
    const admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await isFounderVisible(admin as any, '00000000-0000-4000-8000-000000000000')).toBe(false)
  })
})

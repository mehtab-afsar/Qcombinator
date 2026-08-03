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

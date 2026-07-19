/**
 * F11 — Asset persistence validation gate + the migration's security guarantees.
 *
 * These run WITHOUT a database (like the other migration tests): the gate is pure, and
 * the DB-only guarantees (one-current under concurrency, dedupe, the atomic retire+insert,
 * restore-creates-a-new-row) are verified against the local/shadow DB in the Stage B
 * dry-run and reported honestly — a mocked "it passed" would prove nothing.
 */

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { listProgramsForAsset } from '@/lib/registry'
import { validateAssetPersist, AssetPersistenceError } from '@/lib/assets/validation'
import type { PersistAssetArgs } from '@/lib/assets/versioning'

const base: PersistAssetArgs = {
  founderId: '00000000-0000-0000-0000-000000000001',
  assetId: 'AS001',
  authoredBy: 'program',
  content: '# ICP\nA non-empty markdown body.',
  programTemplateId: 'P001',
  executionId: '00000000-0000-0000-0000-0000000000ff',
}

function expectError(args: PersistAssetArgs, code: string): void {
  try {
    validateAssetPersist(args)
    throw new Error(`expected AssetPersistenceError(${code}), but validation passed`)
  } catch (e) {
    expect(e).toBeInstanceOf(AssetPersistenceError)
    expect((e as AssetPersistenceError).code).toBe(code)
  }
}

describe('F11 validation gate (UC-11 step 2)', () => {
  it('accepts a well-formed program-authored version and derives the Executive', () => {
    const result = validateAssetPersist(base)
    expect(result.executiveId).toBe('growth') // P001 GTM is owned by the growth Executive
  })

  it('BLOCKS a P003 output stored as AS001 (the headline acceptance case)', () => {
    // AS001 is maintained only by P001; P003 has no business writing it.
    expectError({ ...base, programTemplateId: 'P003' }, 'wrong_program')
  })

  it('allows every Program that may maintain an Asset (owner + any sharedWith)', () => {
    // Validates against listProgramsForAsset, not asset.program alone — so if a
    // sharedWith is ever added (e.g. AS004 → P002), this still passes without edits.
    const allowed = listProgramsForAsset('AS001')
    expect(allowed.length).toBeGreaterThan(0)
    for (const program of allowed) {
      const result = validateAssetPersist({ ...base, assetId: 'AS001', programTemplateId: program })
      expect(typeof result.executiveId).toBe('string')
    }
  })

  it('blocks an Asset id that is not in the Registry', () => {
    expectError({ ...base, assetId: 'AS999' }, 'unknown_asset')
  })

  it('requires a program template id for program authorship', () => {
    expectError({ ...base, programTemplateId: undefined }, 'missing_program')
  })

  it('requires an execution id for program authorship', () => {
    expectError({ ...base, executionId: undefined }, 'missing_execution')
  })

  it('forbids an execution id on a founder edit', () => {
    expectError(
      { ...base, authoredBy: 'founder', programTemplateId: undefined, executionId: 'x' },
      'unexpected_execution',
    )
  })

  it('accepts a founder edit with no execution id and derives the owning Executive', () => {
    const result = validateAssetPersist({
      founderId: base.founderId, assetId: 'AS001', authoredBy: 'founder', content: '# edited',
    })
    expect(result.executiveId).toBe('growth')
  })

  it('rejects empty or wrong-typed content (structure + completeness)', () => {
    expectError({ ...base, content: '   ' }, 'bad_structure')       // markdown must be non-empty
    expectError({ ...base, content: { a: 1 } }, 'bad_structure')     // markdown must be a string
  })
})

describe('F11 never touches the Q-Score (ADR-005)', () => {
  it('no module under lib/assets imports or calls applyAgentScoreSignal', () => {
    const dir = join(__dirname, '..', 'lib', 'assets')
    for (const file of readdirSync(dir).filter(f => f.endsWith('.ts'))) {
      const src = readFileSync(join(dir, file), 'utf8')
      expect(src).not.toMatch(/applyAgentScoreSignal/)
    }
  })
})

describe('F11 migration — the write path cannot be bypassed', () => {
  const sql = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20260715000006_asset_versions.sql'),
    'utf8',
  )
  const executable = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

  it('revokes execute on persist_asset_version from authenticated', () => {
    // Without this the function is a public PostgREST RPC that skips the TS gate.
    expect(executable).toMatch(/revoke\s+execute\s+on\s+function\s+persist_asset_version[\s\S]*?from[\s\S]*?authenticated/i)
  })

  it('grants execute only to service_role', () => {
    expect(executable).toMatch(/grant\s+execute\s+on\s+function\s+persist_asset_version[\s\S]*?to\s+service_role/i)
  })

  it('creates NO authenticated write policy on asset_versions (direct writes RLS-denied)', () => {
    const policyBlocks = executable.match(/create\s+policy\s+"[^"]+"\s+on\s+asset_versions\s+for\s+(\w+)/gi) ?? []
    const kinds = policyBlocks.map(b => b.match(/for\s+(\w+)/i)![1].toLowerCase())
    expect(kinds).toEqual(['select']) // exactly one policy, and it is SELECT-only
  })

  it('enforces the execution-ref biconditional as a CHECK', () => {
    expect(executable).toMatch(/check\s*\(\s*\(authored_by\s*=\s*'founder'\)\s*=\s*\(execution_id\s+is\s+null\)\s*\)/i)
  })

  it('enforces exactly-one-current with a partial unique index', () => {
    expect(executable).toMatch(/unique\s+index[\s\S]*?asset_versions[\s\S]*?\(founder_id,\s*asset_id\)\s+where\s+is_current/i)
  })

  it('installs the immutability trigger', () => {
    expect(executable).toMatch(/create\s+trigger\s+asset_versions_immutable/i)
  })
})

describe('F11 founder-edit route (ADR-007)', () => {
  const route = readFileSync(
    join(__dirname, '..', 'app', 'api', 'assets', '[id]', 'route.ts'),
    'utf8',
  )

  it('a PUT persists as authored_by=founder (no execution, no program)', () => {
    // The founder edit is the same versioning path with authoredBy 'founder'. Its
    // no-execution/no-program shape is enforced by the gate + DB CHECK (verified in the
    // dry-run); here we pin that the route wires the founder authorship.
    expect(route).toMatch(/authoredBy:\s*'founder'/)
  })

  it('writes via the service-role client (the gate cannot be bypassed)', () => {
    // Not the user-scoped client — the persist function is revoked from authenticated.
    expect(route).toMatch(/createAdminClient\(\)/)
  })
})

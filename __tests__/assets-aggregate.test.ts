/**
 * Stage 3 — F09's artefact-centric home. GET /api/assets is the aggregate read the Command View
 * needs instead of a five-request waterfall; getCurrentAssetsForProgram is the batched query
 * underneath it.
 *
 * No live Supabase in this test env (same constraint as assets-versioning.test.ts) — the
 * DB-touching path is asserted against the route's own source, matching the established
 * pattern (__tests__/executive-contract.test.ts's "the contract routes" describe block) rather
 * than a hand-rolled Supabase mock that would only prove the mock agrees with itself.
 */

import { readFileSync } from 'fs'
import { getCurrentAssetsForProgram } from '@/lib/assets/versioning'

describe('getCurrentAssetsForProgram', () => {
  it('short-circuits on an empty asset list without touching Supabase', async () => {
    const neverCalled = { from: jest.fn(() => { throw new Error('should not be called') }) }
    await expect(getCurrentAssetsForProgram(neverCalled as never, 'f1', [])).resolves.toEqual([])
    expect(neverCalled.from).not.toHaveBeenCalled()
  })
})

describe('GET /api/assets — the route', () => {
  const route = readFileSync('app/api/assets/route.ts', 'utf8')

  it('is gated by the flag, like every other new-model route', () => {
    expect(route).toContain('newModelOff()')
  })

  it('reads via the RLS-scoped client, not the admin one — this is a read, not a privileged write', () => {
    expect(route).toContain('await createClient()')
    expect(route).not.toContain('createAdminClient')
  })

  it('returns an empty list rather than an error when there is no confirmed mandate yet', () => {
    expect(route).toMatch(/status !== 'confirmed'[\s\S]{0,80}assets:\s*\[\]/)
  })

  it('degrades an unresolvable Program rather than 500ing the whole home', () => {
    // Mirrors buildProgress's own programOrNull fail-open (lib/rhythm/progress.ts) — an
    // active Program id the Registry no longer knows must not take the page down.
    expect(route).toMatch(/try\s*{\s*program\s*=\s*getProgram\(templateId\)\s*}\s*catch\s*{\s*continue\s*}/)
  })

  it('resolves each Asset’s Registry name and current version via the batched read', () => {
    expect(route).toContain('getCurrentAssetsForProgram(supabase, auth.user.id, [...assetIds])')
    expect(route).toContain('getAsset(id)')
  })

  it('F09 artifact organization: resolves each Asset’s owning executive from the Registry, for free off the same walk', () => {
    expect(route).toContain('ownerByAssetId.set(assetId, program.owner)')
    expect(route).toContain('executiveId: ownerByAssetId.get(id) ?? null')
  })
})

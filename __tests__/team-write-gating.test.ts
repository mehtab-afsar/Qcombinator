/**
 * Team Management, Phase 3 — write-path gating.
 *
 * Phase 2 made team data readable across a workspace (widened RLS + getAnchorFounderId).
 * That alone isn't enough: every write to these tables goes through the service-role admin
 * client (RLS bypassed entirely) EXCEPT contract confirm/draft — so the application code is
 * the only gate that exists, and without it any role could confirm the Mandate, edit any
 * Asset, or approve an irreversible Action.
 *
 * Two separate things had to be fixed per write path, not just one:
 *   1. A role check (who is allowed to do this at all).
 *   2. Writing under the workspace's shared anchor founder_id, not the acting individual's
 *      own auth.user.id — otherwise a non-owner's write starts a second, invisible trail
 *      nobody else's reads (now team-shared) would ever see. Confirmed real for asset_versions
 *      (unique current-version-per-founder_id), action_log (loadPending scopes its lookup to
 *      founder_id — a non-owner's own auth.user.id finds nothing to approve), and
 *      operating_rhythm_runs (unique(founder_id, cycle_key) — a second identity means a second,
 *      parallel cycle for the same week instead of resuming the shared one).
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('POST /api/contracts — only the owner can draft or confirm the Mandate', () => {
  const src = read('app/api/contracts/route.ts')

  it('checks the caller\'s team role before either branch', () => {
    const postIdx = src.indexOf('export async function POST')
    const draftIdx = src.indexOf("parsed.data.action === 'draft'", postIdx)
    const roleCheckIdx = src.indexOf('getMyTeamRole(auth.user.id, supabase)', postIdx)
    expect(roleCheckIdx).toBeGreaterThan(-1)
    expect(roleCheckIdx).toBeLessThan(draftIdx)
  })

  it('rejects anyone who is not literally the owner — not owner-or-admin', () => {
    expect(src).toMatch(/if\s*\(\s*role\s*!==\s*'owner'\s*\)/)
    const block = src.slice(src.indexOf("role !== 'owner'"), src.indexOf("role !== 'owner'") + 150)
    expect(block).toContain('status: 403')
  })
})

describe('PUT /api/assets/[id] — canEditAsset gates the write, and it lands under the team anchor', () => {
  const src = read('app/api/assets/[id]/route.ts')

  it('imports and calls canEditAsset, not a hand-rolled role check', () => {
    expect(src).toContain('canEditAsset')
    expect(src).toMatch(/if\s*\(\s*!role\s*\|\|\s*!canEditAsset\(role\)\s*\)/)
  })

  it('persists the new version under the resolved anchor id, not auth.user.id directly', () => {
    const block = src.slice(src.indexOf('persistAssetVersion(admin, {'), src.indexOf('persistAssetVersion(admin, {') + 120)
    expect(block).toContain('founderId: anchorId')
    expect(block).not.toContain('founderId: auth.user.id')
  })

  it('still attributes the edit to the real individual for analytics, not the anchor', () => {
    expect(src).toContain('trackAssetEditedByFounder(auth.user.id')
  })
})

describe('POST /api/actions — canApproveAction gates the write, and it operates on the team\'s shared entries', () => {
  const src = read('app/api/actions/route.ts')

  it('imports and calls canApproveAction, not a hand-rolled role check', () => {
    expect(src).toContain('canApproveAction')
    expect(src).toMatch(/if\s*\(\s*!role\s*\|\|\s*!canApproveAction\(role\)\s*\)/)
  })

  it('resolves entries under the anchor id — a non-owner approver must find the team\'s pending action, not their own empty slot', () => {
    expect(src).toContain('founderId: anchorId, entryId, payloadHash: payloadHash!, approvedBy: auth.user.id')
    expect(src).toContain('founderId: anchorId, entryId, declinedBy: auth.user.id')
  })

  it('still attributes approval/decline to the real individual, not the anchor', () => {
    expect(src).toContain('approvedBy: auth.user.id')
    expect(src).toContain('declinedBy: auth.user.id')
  })
})

describe('POST /api/rhythm/run — a manually triggered cycle resumes the team\'s shared run, not a second one', () => {
  const src = read('app/api/rhythm/run/route.ts')

  it('resolveRun resolves the anchor id before touching the contract or the run', () => {
    const fnStart = src.indexOf('async function resolveRun')
    const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart))
    const anchorIdx = fnBody.indexOf('getAnchorFounderId(auth.user.id, admin)')
    const contractIdx = fnBody.indexOf('getCurrentContract(admin, anchorId)')
    const createIdx = fnBody.indexOf('createOrResumeRun(admin, { founderId: anchorId')
    expect(anchorIdx).toBeGreaterThan(-1)
    expect(contractIdx).toBeGreaterThan(anchorIdx)
    expect(createIdx).toBeGreaterThan(anchorIdx)
  })
})

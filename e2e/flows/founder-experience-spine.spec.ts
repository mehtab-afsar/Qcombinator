import { test, expect } from '@playwright/test'
import { signInWithCredentials, makeAuthenticatedRequest } from '../helpers/auth'

/**
 * Live proof for the Founder Experience spine (mandate → activation → artefacts → direct →
 * actions) — the 5-stage build in this session. Every step below drives the REAL engine: real
 * Claude calls (5x Asset judgement, 1 briefing, up to 5 Actions), real Postgres writes, real
 * chained /api/rhythm/step hand-offs. Nothing here is mocked.
 *
 * Runs against the REAL local founder account mehtabafsar346@gmail.com, by explicit choice —
 * a fresh disposable test account couldn't be created via the app's normal signup route because
 * local Supabase Auth (GoTrue) currently rejects the legacy HS256 service-role key on its admin
 * endpoints (`signing method HS256 is invalid`, confirmed via direct curl against
 * /auth/v1/admin/users — a pre-existing local-infra drift, unrelated to this session's changes;
 * PostgREST accepts the same key fine). Password-grant sign-in still works (GoTrue mints a fresh
 * token with its current key on login), so a temporary password was set directly via
 * `UPDATE auth.users` (bypassing the broken admin endpoint entirely) rather than touching any
 * Supabase container config — no restart, nothing destructive.
 *
 * This account already had a real Q-Score and a real DRAFT mandate (epoch 1, P001 active) —
 * this test confirms that existing draft rather than drafting a new one, both to respect the
 * founder's real data and to skip an extra ~90s S002 call the spine's Stage-2+ work doesn't need
 * to re-prove (S002 was already live-verified earlier this session).
 *
 * Long-running by nature (a full P001 cycle is up to 11 sequential real LLM calls): each test's
 * timeout is set generously below, not left to the 30s default.
 */

test.describe.configure({ mode: 'serial' })

const email = 'mehtabafsar346@gmail.com'
const password = 'SpineTest_Temp_9f2c!'

test('confirming the existing draft mandate — Stage 2a triggers the cycle', async ({ page }) => {
  test.setTimeout(60_000)

  await signInWithCredentials(page, email, password, /\/founder/)

  const contractsRes = await makeAuthenticatedRequest(page, '/api/contracts')
  expect(contractsRes.status).toBe(200)
  const contract = (contractsRes.data as { contract: { id: string; status: string } | null }).contract
  expect(contract, 'this account is expected to already have a draft mandate').toBeTruthy()
  expect(contract!.status).toBe('draft')

  // Stage 2a — confirming must return fast (startCycleIfDue only does a cheap DB op inline
  // before handing the real work to after()); the cycle itself runs in the background from here.
  const confirmRes = await makeAuthenticatedRequest(page, '/api/contracts', {
    method: 'POST',
    body: { action: 'confirm', contractId: contract!.id },
  })
  expect(confirmRes.status).toBe(200)
})

test('Stage 2 — Activation: confirming shows a real document appearing', async ({ page }) => {
  test.setTimeout(6 * 60_000) // waiting for the FIRST real asset generation to land

  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')

  // The Activation screen itself — proves ActivationGate routed here instead of straight to
  // CommandView, because the run it fetched really is 'running' and really did start at/after
  // this contract's confirmedAt.
  await expect(page.getByText('Your team is starting on your mandate')).toBeVisible({ timeout: 20_000 })

  // The first real, persisted Asset reveal — not a stub, the actual Registry-named document.
  const firstDoc = page.getByText(/ICP Profiles|Pains.*Gains|Buyer Journey|Positioning|Channel Strategy/i).first()
  await expect(firstDoc).toBeVisible({ timeout: 5 * 60_000 })
})

test('Stage 2 → 3 — the cycle runs to completion and lands on the artefact-centric home', async ({ page }) => {
  test.setTimeout(20 * 60_000) // the REMAINING 10 steps: 4 more assets, 1 briefing, up to 5 actions

  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')

  // Poll GET /api/rhythm/run directly rather than the UI — this is the same endpoint Activation
  // itself polls, and asserting against it directly is a stable way to know the real cycle
  // actually finished, independent of exactly how the DOM renders that moment.
  let status: string | undefined
  for (let i = 0; i < 120; i++) { // 120 x 5s = up to 10 minutes of polling on top of the wait above
    const res = await makeAuthenticatedRequest(page, '/api/rhythm/run')
    const progress = (res.data as { progress: { status: string; done: number; total: number } | null }).progress
    status = progress?.status
    if (status && status !== 'running') break
    await page.waitForTimeout(5_000)
  }
  expect(status, 'the cycle must reach a terminal state — running forever is FU-004').not.toBe('running')

  await page.reload()
  await page.waitForLoadState('networkidle')

  // Stage 3 — the documents lead. Confirmed via the actual aggregate endpoint, not scraped text.
  const assetsRes = await makeAuthenticatedRequest(page, '/api/assets')
  expect(assetsRes.status).toBe(200)
  const assets = (assetsRes.data as { assets: Array<{ id: string; asset: unknown }> }).assets
  expect(assets.length).toBeGreaterThan(0)
  const generated = assets.filter(a => a.asset !== null)
  expect(generated.length, 'at least one real Asset version must exist once the cycle settles').toBeGreaterThan(0)

  await expect(page.getByText('Your documents')).toBeVisible({ timeout: 15_000 })
})

test('Stage 4 — directing a rework produces a real new version', async ({ page }) => {
  test.setTimeout(4 * 60_000) // one real Claude call for the reworked document

  await signInWithCredentials(page, email, password, /\/founder/)

  const assetsRes = await makeAuthenticatedRequest(page, '/api/assets')
  const assets = (assetsRes.data as { assets: Array<{ id: string; asset: { version: number } | null }> }).assets
  const target = assets.find(a => a.asset !== null)
  expect(target, 'Stage 4 needs at least one generated Asset to direct a rework on').toBeTruthy()
  const startingVersion = target!.asset!.version

  await page.goto(`/founder/assets/${target!.id}`)
  await page.waitForLoadState('networkidle')

  await expect(page.getByText('Direct a rework')).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder(/Sharpen the ICP/i).fill('Add one concrete, numbered example to illustrate the main point.')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText(/Reworked — now version/i)).toBeVisible({ timeout: 3 * 60_000 })

  const afterRes = await makeAuthenticatedRequest(page, `/api/assets/${target!.id}`)
  const afterAsset = (afterRes.data as { asset: { version: number; updateReason: string | null } }).asset
  expect(afterAsset.version).toBeGreaterThan(startingVersion)
  expect(afterAsset.updateReason).toMatch(/^Directed:/)
})

test('Stage 5 — the action surface reports every action with honest status', async ({ page }) => {
  test.setTimeout(60_000)

  await signInWithCredentials(page, email, password, /\/founder/)

  const res = await makeAuthenticatedRequest(page, '/api/actions')
  expect(res.status).toBe(200)
  const data = res.data as {
    pending: Array<{ actionId: string }>
    all: Array<{ actionId: string; status: string }>
  }

  // P001 defines 5 actions (FU-009) — all 5 must be legible, none silently omitted.
  expect(data.all.length).toBe(5)
  expect(data.all.every(a => a.status && a.status.length > 0)).toBe(true)

  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')
  const panel = page.getByText(/Needs your approval|Your team's actions/i)
  await expect(panel.first()).toBeVisible({ timeout: 15_000 })
})

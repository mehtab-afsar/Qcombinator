/**
 * E2E — New Company Full Journey (Diagnostic)
 *
 * Covers the complete new-founder happy path from scratch:
 *   1. Sign up  → /founder/onboarding (4 pages + photo skip)
 *   2. Profile builder → navigate through all sections to step 6
 *   3. Calculate Q-Score
 *   4. Patel agent → send ICP generation request → artifact card appears
 *   5. View ICP document
 *
 * DIAGNOSTIC design: every step is wrapped in try/catch so the test keeps
 * running even when individual steps fail. A results table is printed to the
 * terminal at the end so you can see at a glance what's working and what's broken.
 *
 * Each run creates a fresh Supabase user (email_confirm: true → no mail server
 * needed). Test accounts accumulate; bulk-delete from Supabase console by
 * filtering on email like "test-new-%" if needed.
 *
 * Run:
 *   npx playwright test e2e/new-company-journey.spec.ts --headed
 *   npx playwright test e2e/new-company-journey.spec.ts --reporter=html && npx playwright show-report
 */

import { test, expect, Page } from '@playwright/test'

// ── test data ─────────────────────────────────────────────────────────────────

const RUN_ID   = Date.now()
const EMAIL    = `test-new-${RUN_ID}@pw.test`
const PASSWORD = 'TestPass123!'
const NAME     = 'PW Test Founder'
const COMPANY  = 'PW Health Co'

// ── result tracker ────────────────────────────────────────────────────────────

type StepStatus = 'PASS' | 'FAIL' | 'SKIP'
interface StepResult { step: string; status: StepStatus; detail: string }
const results: StepResult[] = []

async function run(
  label: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  try {
    await fn()
    results.push({ step: label, status: 'PASS', detail: '' })
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err)
    results.push({ step: label, status: 'FAIL', detail: msg.slice(0, 120) })
    return false
  }
}

function skip(label: string, reason: string) {
  results.push({ step: label, status: 'SKIP', detail: reason })
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Find the send button for the Patel chat input bar. */
function sendButton(page: Page) {
  return page
    .locator('div')
    .filter({ has: page.locator('textarea') })
    .last()
    .locator('button')
    .last()
}

// ── the test ──────────────────────────────────────────────────────────────────

test.describe('New company full journey — diagnostic', () => {
  // Generous global timeout for the ICP generation step (~120s alone)
  test.setTimeout(300_000)

  test('signup → profile builder → Q-Score → Patel ICP', async ({ page }) => {

    // ══════════════════════════════════════════════════════════════════
    // PHASE 1 — SIGNUP
    // ══════════════════════════════════════════════════════════════════

    const onboardingLoaded = await run('[Signup] Onboarding page loads', async () => {
      await page.goto('/founder/onboarding')
      await page.waitForLoadState('networkidle')
      await expect(
        page.locator('text=/Create your account/i').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const step1Done = await run('[Signup] Step 1 — account details', async () => {
      if (!onboardingLoaded) throw new Error('Skipped — onboarding did not load')
      // Full name: the only input[type="text"] on page 1
      await page.locator('input[type="text"]').first().fill(NAME)
      await page.locator('input[type="email"]').fill(EMAIL)
      await page.locator('input[type="password"]').fill(PASSWORD)
      // "Continue →" button
      await page.locator('button:has-text("Continue")').first().click()
      await expect(
        page.locator('text=/Your startup/i').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const step2Done = await run('[Signup] Step 2 — startup details', async () => {
      if (!step1Done) throw new Error('Skipped — step 1 failed')
      // Company name — TextInput with placeholder "e.g. Acme Inc."
      await page.locator('input[placeholder="e.g. Acme Inc."]').fill(COMPANY)
      // Industry: OptionCard button
      await page.locator('button:has-text("AI & Software")').first().click()
      // Stage: OptionCard button
      await page.locator('button:has-text("Product Development")').first().click()
      await page.locator('button:has-text("Continue")').first().click()
      // Should advance to "Traction & team" step
      await expect(
        page.locator('text=/Traction|Revenue/i').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const step3Done = await run('[Signup] Step 3 — traction & team', async () => {
      if (!step2Done) throw new Error('Skipped — step 2 failed')
      // Revenue: OptionCard
      await page.locator('button:has-text("Pre-revenue")').first().click()
      // Team size: Pill buttons — first Pill is "1–5"
      const pills = page.locator('button').filter({ hasText: /^1/ }) // "1–5" or "1-5"
      await pills.first().click()
      // Funding: Pill button
      await page.locator('button:has-text("Bootstrapped")').first().click()
      await page.locator('button:has-text("Continue")').first().click()
      await expect(
        page.locator('text=/problem|solving/i').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const step4Done = await run('[Signup] Step 4 — problem & submit', async () => {
      if (!step3Done) throw new Error('Skipped — step 3 failed')
      // Problem statement: only textarea on this page
      await page.locator('textarea').first().fill(
        'Healthcare compliance officers at mid-size hospitals spend 20+ hours per week on manual documentation workflows that are error-prone and audit-risky.'
      )
      // Target customer: TextInput with "Mid-market" placeholder
      await page.locator('input[placeholder*="Mid-market"]').fill(
        'Compliance directors at 100–500 bed hospitals in the US'
      )
      // Submit: "Launch my profile" (confirmed from source)
      await page.locator('button:has-text("Launch my profile")').click()
      // API call + Supabase user creation — allow up to 25s
      await expect(
        page.locator('text=/Add your photo/i').first()
      ).toBeVisible({ timeout: 25_000 })
    })

    const skipPhotoDone = await run('[Signup] Skip photo → profile builder', async () => {
      if (!step4Done) throw new Error('Skipped — step 4 failed')
      await page.locator('button:has-text("Skip for now")').click()
      await page.waitForURL(/profile-builder/, { timeout: 15_000 })
    })

    // ══════════════════════════════════════════════════════════════════
    // PHASE 2 — PROFILE BUILDER
    // ══════════════════════════════════════════════════════════════════

    const pbLoaded = await run('[Profile Builder] Page loads', async () => {
      if (!skipPhotoDone) throw new Error('Skipped — did not land on profile builder')
      await page.waitForLoadState('networkidle')
      // Profile builder renders either a textarea (chat input) or section label text
      await expect(
        page.locator('textarea, text=/Documents|Pitch|Section/i').first()
      ).toBeVisible({ timeout: 15_000 })
    })

    const reachedStep6 = await run('[Profile Builder] Advance through all sections to step 6', async () => {
      if (!pbLoaded) throw new Error('Skipped — profile builder did not load')

      // Click "Next →" / "Review & Submit →" up to 10 times to reach step 6.
      // Stop as soon as the Calculate button is visible.
      for (let i = 0; i < 10; i++) {
        const calcBtn = page.locator('button:has-text(/Calculate My Q-Score/i)').first()
        if (await calcBtn.isVisible({ timeout: 500 }).catch(() => false)) break

        // Try each navigation button text in priority order
        const nextBtn = page.locator('button').filter({ hasText: /Review & Submit|Next →|Next|Skip section/i }).first()
        const visible = await nextBtn.isVisible({ timeout: 800 }).catch(() => false)
        if (visible) await nextBtn.click()

        await page.waitForTimeout(1_200)
      }

      await expect(
        page.locator('button:has-text(/Calculate My Q-Score/i)').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const _qScoreCalculated = await run('[Profile Builder] Calculate Q-Score', async () => {
      if (!reachedStep6) throw new Error('Skipped — did not reach step 6')
      // Button may be disabled if canSubmit is false — report clearly
      const btn = page.locator('button:has-text(/Calculate My Q-Score/i)').first()
      const disabled = await btn.getAttribute('disabled')
      if (disabled !== null) throw new Error('Calculate button is disabled — canSubmit is false (profile data insufficient)')
      await btn.click()
      await expect(
        page.locator('text=/Q-Score|Grade|score/i').first()
      ).toBeVisible({ timeout: 30_000 })
    })

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3 — PATEL + ICP GENERATION
    // ══════════════════════════════════════════════════════════════════

    const patelLoaded = await run('[Patel] Navigate to /founder/cxo/patel', async () => {
      await page.goto('/founder/cxo/patel')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15_000 })
    })

    const messageSent = await run('[Patel] Send ICP generation request', async () => {
      if (!patelLoaded) throw new Error('Skipped — Patel workspace did not load')
      const input = page.locator('textarea').first()
      const msg = 'Please create an ICP document for my healthcare compliance startup'
      await input.fill(msg)
      await sendButton(page).click()
      // User message bubble should appear within 15s
      await expect(page.locator(`text=${msg}`).first()).toBeVisible({ timeout: 15_000 })
    })

    const artifactAppeared = await run('[Patel] ICP artifact card appears in chat', async () => {
      if (!messageSent) throw new Error('Skipped — message was not sent')
      // Generation takes 45–90s; allow up to 120s
      await expect(
        page.locator('text=/Document ready/i').first()
      ).toBeVisible({ timeout: 120_000 })
    })

    if (artifactAppeared) {
      await run('[Patel] View ICP document', async () => {
        const viewBtn = page.locator('button:has-text(/View document/i)').first()
        await expect(viewBtn).toBeVisible({ timeout: 5_000 })
        await viewBtn.click()
        // The document panel opens — check for ICP-related heading
        await expect.soft(
          page.locator('text=/ICP|Ideal Customer/i').first()
        ).toBeVisible({ timeout: 10_000 })
      })

      await run('[Patel] ICP document renders structured content (not raw JSON)', async () => {
        const bodyText = await page.locator('body').innerText()
        // Raw JSON would start lines with { or have raw field names like "type":
        if (bodyText.includes('"icp_document"') || /^\s*\{/.test(bodyText)) {
          throw new Error('Document panel shows raw JSON — ICPRenderer not rendering')
        }
      })
    } else {
      skip('[Patel] View ICP document', 'Artifact card did not appear')
      skip('[Patel] ICP document renders structured content', 'Artifact card did not appear')
    }

    // ══════════════════════════════════════════════════════════════════
    // SUMMARY — printed to terminal and attached to the Playwright report
    // ══════════════════════════════════════════════════════════════════

    const passed = results.filter(r => r.status === 'PASS').length
    const failed = results.filter(r => r.status === 'FAIL').length
    const skipped = results.filter(r => r.status === 'SKIP').length

    console.log('\n\n══════════════════════════════════════════════════')
    console.log(`  NEW COMPANY JOURNEY — DIAGNOSTIC RESULTS`)
    console.log(`  Email: ${EMAIL}`)
    console.log(`  Run: ${new Date().toISOString()}`)
    console.log('══════════════════════════════════════════════════')
    console.table(results)
    console.log(`  PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}`)
    console.log('══════════════════════════════════════════════════\n')

    // Attach results to the Playwright HTML report as test info
    test.info().annotations.push({
      type: 'diagnostic-results',
      description: JSON.stringify({ passed, failed, skipped, email: EMAIL }),
    })

    // Attach a human-readable summary to the report
    const summary = results
      .map(r => `${r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭'} ${r.step}${r.detail ? ` — ${r.detail}` : ''}`)
      .join('\n')
    await test.info().attach('diagnostic-summary.txt', {
      body: Buffer.from(summary),
      contentType: 'text/plain',
    })

    // Fail the test if any critical step failed (non-SKIP failures)
    // This surfaces in CI but the full detail is in the table above.
    if (failed > 0) {
      const failedSteps = results
        .filter(r => r.status === 'FAIL')
        .map(r => `  • ${r.step}: ${r.detail}`)
        .join('\n')
      throw new Error(`${failed} step(s) failed:\n${failedSteps}`)
    }
  })
})

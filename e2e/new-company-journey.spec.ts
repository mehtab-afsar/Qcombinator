/**
 * E2E — New Company Full Journey (Diagnostic)
 *
 * Covers the complete new-founder happy path from scratch:
 *   1. Sign up  → /founder/onboarding (4 pages + photo skip)
 *   2. Profile builder → skip docs → skip pitch → answer sections 1-3 → Q-Score
 *   3. Patel agent → answer diagnostic question → request ICP → view document
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

// Pre-written rich answers for each profile builder section — detailed enough
// to get completionScore ≥ 70 in a single exchange.
const ANSWERS = {
  s1: `We've completed 52 discovery interviews with compliance directors at US hospitals. Three are in paid pilots at $1,500/month ($4,500 MRR total). One signed an LOI for $18,000 ARR. Retention is strong — first customer is in month 4 with 115% NRR and has expanded scope. Sales cycle averages 90 days from first call to signed agreement. No customer has churned.`,

  s2: `TAM: 6,200 US hospitals averaging $280K/year on compliance software equals a $1.7B addressable market. Market urgency is acute — new CMS Conditions of Participation audits began in 2024 with $1M+ fines per violation, creating immediate mandatory buying pressure. Competitors: Compliance.ai (AI-first, Series A, 48-hour batch reports), Symplr (broad enterprise suite), and legacy Navex Global (on-premise only). We are the only real-time detection solution — 30-second violation alerts vs competitors' 48-hour batch processing. Expansion: EU GDPR healthcare module in 2025, then Canadian provincial health authorities.`,

  s3: `Patent pending USPTO application #18/234,567 for real-time audit trail analysis using transformer models. Our technical moat: proprietary fine-tuned model trained on 2.1M de-identified hospital audit records obtained via 2-year data partnership with HCA Healthcare — no competitor has this dataset. A new entrant would need 14+ months and $2.5M in data licensing costs to replicate. We process 50,000 audit events per second with sub-30-second violation detection — 96x faster than the closest competitor's 48-hour batch pipeline. Build complexity is extremely high: required custom HIPAA-compliant inference infrastructure and EHR integration layer.`,
}

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

/**
 * Fill a profile builder section's chat interface with a pre-written answer
 * and wait up to 20s for completionScore to reach ≥ 70 ("Complete" indicator).
 * If not complete after first exchange, sends a follow-up and waits again.
 */
async function answerSection(page: Page, sectionHeading: string, answer: string): Promise<void> {
  // Confirm the correct section heading is visible
  await page.waitForFunction(
    (h) => document.body.innerText.includes(h),
    sectionHeading,
    { timeout: 12_000 },
  )
  // Wait for the AI's first question to load (section initialises with an LLM call)
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading question'),
    { timeout: 15_000 },
  )
  // Small buffer after question appears before typing
  await page.waitForTimeout(1_000)

  // Send the pre-written answer
  await page.locator('textarea').last().fill(answer)
  await page.keyboard.press('Enter')

  // Wait for the backend to evaluate and update completionScore (Haiku call ~3-6s)
  await page.waitForTimeout(14_000)

  const isComplete = await page
    .locator('body')
    .evaluate((el) => (el as HTMLElement).innerText.includes('Complete'))

  if (!isComplete) {
    // Second pass — rephrase with extra specificity
    await page.locator('textarea').last().fill(
      `Additional specifics: ${answer.slice(0, 300)} We have documented evidence and exact figures for all of the above.`
    )
    await page.keyboard.press('Enter')
    await page.waitForTimeout(14_000)
  }
}

// ── the test ──────────────────────────────────────────────────────────────────

test.describe('New company full journey — diagnostic', () => {
  // Generous global timeout: profile builder (3 × 30s) + ICP generation (~120s)
  test.setTimeout(600_000)

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
      await page.locator('input[type="text"]').first().fill(NAME)
      await page.locator('input[type="email"]').fill(EMAIL)
      await page.locator('input[type="password"]').fill(PASSWORD)
      await page.locator('button:has-text("Continue")').first().click()
      await expect(
        page.locator('text=/Your startup/i').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const step2Done = await run('[Signup] Step 2 — startup details', async () => {
      if (!step1Done) throw new Error('Skipped — step 1 failed')
      await page.locator('input[placeholder="e.g. Acme Inc."]').fill(COMPANY)
      await page.locator('button:has-text("AI & Software")').first().click()
      await page.locator('button:has-text("Product Development")').first().click()
      await page.locator('button:has-text("Continue")').first().click()
      await expect(
        page.locator('text=/Traction|Revenue/i').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const step3Done = await run('[Signup] Step 3 — traction & team', async () => {
      if (!step2Done) throw new Error('Skipped — step 2 failed')
      await page.locator('button:has-text("Pre-revenue")').first().click()
      const pills = page.locator('button').filter({ hasText: /^1/ })
      await pills.first().click()
      await page.locator('button:has-text("Bootstrapped")').first().click()
      await page.locator('button:has-text("Continue")').first().click()
      await expect(
        page.locator('text=/problem|solving/i').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const step4Done = await run('[Signup] Step 4 — problem & submit', async () => {
      if (!step3Done) throw new Error('Skipped — step 3 failed')
      await page.locator('textarea').first().fill(
        'Healthcare compliance officers at mid-size hospitals spend 20+ hours per week on manual documentation workflows that are error-prone and audit-risky.'
      )
      await page.locator('input[placeholder*="Mid-market"]').fill(
        'Compliance directors at 100–500 bed hospitals in the US'
      )
      await page.locator('button:has-text("Launch my profile")').click()
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
      await expect(
        page.locator('textarea, text=/Documents|Pitch|Section/i').first()
      ).toBeVisible({ timeout: 15_000 })
    })

    const skippedDocs = await run('[Profile Builder] Skip documents step', async () => {
      if (!pbLoaded) throw new Error('Skipped — profile builder did not load')
      // Button reads "Skip, answer questions →" when no files are uploaded
      const skipBtn = page.locator('button').filter({ hasText: /Skip.*question|Continue →/i }).first()
      await expect(skipBtn).toBeVisible({ timeout: 10_000 })
      await skipBtn.click()
      // Should advance to pitch step — wait for the textarea
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10_000 })
    })

    const skippedPitch = await run('[Profile Builder] Skip pitch step', async () => {
      if (!skippedDocs) throw new Error('Skipped — docs step failed')
      // The pitch step has a "Next →" button at the bottom — click it to skip
      const nextBtn = page.locator('button').filter({ hasText: /^Next →$/ }).first()
      await expect(nextBtn).toBeVisible({ timeout: 10_000 })
      await nextBtn.click()
      // Should now be on Section 1 — Market Validation
      await page.waitForFunction(
        () => document.body.innerText.includes('Market Validation'),
        { timeout: 10_000 },
      )
    })

    const s1Done = await run('[Profile Builder] Answer Section 1 — Market Validation', async () => {
      if (!skippedPitch) throw new Error('Skipped — pitch skip failed')
      await answerSection(page, 'Market Validation', ANSWERS.s1)
    })

    const s1Advanced = await run('[Profile Builder] Advance to Section 2', async () => {
      if (!s1Done) throw new Error('Skipped — section 1 failed')
      await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
      await page.waitForFunction(
        () => document.body.innerText.includes('Market & Competition'),
        { timeout: 10_000 },
      )
    })

    const s2Done = await run('[Profile Builder] Answer Section 2 — Market & Competition', async () => {
      if (!s1Advanced) throw new Error('Skipped — section 1 advance failed')
      await answerSection(page, 'Market & Competition', ANSWERS.s2)
    })

    const s2Advanced = await run('[Profile Builder] Advance to Section 3', async () => {
      if (!s2Done) throw new Error('Skipped — section 2 failed')
      await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
      await page.waitForFunction(
        () => document.body.innerText.includes('IP & Technology') || document.body.innerText.includes('Defensibility'),
        { timeout: 10_000 },
      )
    })

    const s3Done = await run('[Profile Builder] Answer Section 3 — IP & Defensibility', async () => {
      if (!s2Advanced) throw new Error('Skipped — section 2 advance failed')
      await answerSection(page, 'IP & Technology', ANSWERS.s3)
    })

    const reachedStep6 = await run('[Profile Builder] Skip sections 4-5 → Review & Submit', async () => {
      if (!s3Done) throw new Error('Skipped — section 3 failed')
      // Click Next → twice (section 4, then section 5 → Review & Submit →)
      for (let i = 0; i < 3; i++) {
        const btn = page.locator('button').filter({ hasText: /Next →|Review & Submit →/ }).first()
        const visible = await btn.isVisible({ timeout: 3_000 }).catch(() => false)
        if (!visible) break
        await btn.click()
        await page.waitForTimeout(1_200)
      }
      // Confirm we're on step 6
      await expect(
        page.locator('button:has-text(/Calculate My Q-Score/i)').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const qScoreCalculated = await run('[Profile Builder] Calculate Q-Score', async () => {
      if (!reachedStep6) throw new Error('Skipped — did not reach step 6')
      const btn = page.locator('button:has-text(/Calculate My Q-Score/i)').first()
      const disabled = await btn.getAttribute('disabled')
      if (disabled !== null) {
        // Report the actual completion state for debugging
        const bodyText = await page.locator('body').innerText()
        const completedMatch = bodyText.match(/(\d+)\/5 sections complete/)
        throw new Error(
          `Calculate button disabled — completedCount insufficient. ` +
          (completedMatch ? completedMatch[0] : 'Could not parse section count')
        )
      }
      await btn.click()
      await expect(
        page.locator('text=/Q-Score|Grade|score/i').first()
      ).toBeVisible({ timeout: 40_000 })
    })

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3 — PATEL + ICP GENERATION
    // ══════════════════════════════════════════════════════════════════

    const patelLoaded = await run('[Patel] Navigate to /founder/cxo/patel', async () => {
      await page.goto('/founder/cxo/patel')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15_000 })
    })

    const _contextSent = await run('[Patel] Answer opening diagnostic question with company context', async () => {
      if (!patelLoaded) throw new Error('Skipped — Patel workspace did not load')
      // Wait for Patel's first message — it always asks a question within ~10s
      await page.waitForFunction(
        () => document.body.innerText.includes('?'),
        { timeout: 30_000 },
      )
      const ctx =
        'We target compliance directors at US hospitals (100–500 beds). ' +
        '52 discovery interviews complete, 3 paid pilots at $1,500/month ($4,500 MRR), ' +
        'one $18K ARR LOI signed. Sales cycle 90 days. TAM $1.7B US hospitals. ' +
        'Competitors Compliance.ai and Symplr run 48-hour batch reports; we detect violations in 30 seconds. ' +
        'Patent pending on real-time audit trail analysis. Customers expand — 115% NRR on first cohort.'
      await page.locator('textarea').first().fill(ctx)
      await sendButton(page).click()
      // Wait for Patel to acknowledge and respond
      await page.waitForTimeout(12_000)
    })

    const icpRequested = await run('[Patel] Request ICP generation (Build D1 ICP Definition)', async () => {
      if (!patelLoaded) throw new Error('Skipped — Patel workspace did not load')
      await page.locator('textarea').first().fill('Build D1 ICP Definition')
      await sendButton(page).click()
      await expect(
        page.locator('text=Build D1 ICP Definition').first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const artifactAppeared = await run('[Patel] ICP artifact card appears in chat', async () => {
      if (!icpRequested) throw new Error('Skipped — ICP request was not sent')
      // Generation takes 20–60s; allow up to 150s (ICP is an 8k-token Sonnet call)
      // Match on tool_done summary text, artifact_card button, or any "ready" indicator
      await expect(
        page.locator('text=/ICP Definition ready|ICP.*ready|Document ready|D1.*ready/i').first()
      ).toBeVisible({ timeout: 150_000 })
    })

    if (artifactAppeared) {
      await run('[Patel] View ICP document', async () => {
        // The artifact_card renders a button with the artifact title; look for View or the title itself
        const viewBtn = page
          .locator('button')
          .filter({ hasText: /View document|ICP Definition|Ideal Customer/i })
          .first()
        await expect(viewBtn).toBeVisible({ timeout: 8_000 })
        await viewBtn.click()
        // The DeliverablePanel opens — verify ICP-related heading is visible
        await expect(
          page.locator('text=/ICP|Ideal Customer|Target Segment|Persona/i').first()
        ).toBeVisible({ timeout: 10_000 })
      })

      await run('[Patel] ICP document renders structured content (not raw JSON)', async () => {
        const bodyText = await page.locator('body').innerText()
        if (bodyText.includes('"icp_document"') || /^\s*\{/.test(bodyText)) {
          throw new Error('Document panel shows raw JSON — ICPRenderer not rendering')
        }
        // Verify at least one structured field label is present
        const hasStructuredContent =
          bodyText.includes('Persona') ||
          bodyText.includes('Segment') ||
          bodyText.includes('Target') ||
          bodyText.includes('Trigger')
        if (!hasStructuredContent) {
          throw new Error('ICP panel content looks empty — no structured sections found')
        }
      })
    } else {
      skip('[Patel] View ICP document', 'Artifact card did not appear')
      skip('[Patel] ICP document renders structured content', 'Artifact card did not appear')
    }

    // ══════════════════════════════════════════════════════════════════
    // SUMMARY — printed to terminal and attached to the Playwright report
    // ══════════════════════════════════════════════════════════════════

    const passed  = results.filter(r => r.status === 'PASS').length
    const failed  = results.filter(r => r.status === 'FAIL').length
    const skipped = results.filter(r => r.status === 'SKIP').length

    console.log('\n\n══════════════════════════════════════════════════')
    console.log(`  NEW COMPANY JOURNEY — DIAGNOSTIC RESULTS`)
    console.log(`  Email: ${EMAIL}`)
    console.log(`  Run: ${new Date().toISOString()}`)
    console.log('══════════════════════════════════════════════════')
    console.table(results)
    console.log(`  PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}`)
    console.log('══════════════════════════════════════════════════\n')

    test.info().annotations.push({
      type: 'diagnostic-results',
      description: JSON.stringify({ passed, failed, skipped, email: EMAIL }),
    })

    const summary = results
      .map(r => `${r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭'} ${r.step}${r.detail ? ` — ${r.detail}` : ''}`)
      .join('\n')
    await test.info().attach('diagnostic-summary.txt', {
      body: Buffer.from(summary),
      contentType: 'text/plain',
    })

    if (failed > 0) {
      const failedSteps = results
        .filter(r => r.status === 'FAIL')
        .map(r => `  • ${r.step}: ${r.detail}`)
        .join('\n')
      throw new Error(`${failed} step(s) failed:\n${failedSteps}`)
    }

    // Warn if Q-Score was skipped/failed but ICP still passed (data quality risk)
    if (!qScoreCalculated && artifactAppeared) {
      console.warn('[warn] ICP generated without a calculated Q-Score — context may be thin')
    }
  })
})

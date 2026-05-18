/**
 * E2E — Deliverables Flow (Syncflow dummy company)
 *
 * Covers the complete GTM journey for a fresh B2B SaaS company:
 *   1. Sign up  → /founder/onboarding (4 pages + photo skip)
 *   2. Profile builder → skip docs → skip pitch → answer ALL 5 sections → Q-Score
 *   3. Patel agent → provide context → generate D1–D6 deliverables
 *      For each deliverable: verify artifact card, inline viewer, PDF button
 *
 * DIAGNOSTIC design: every step is wrapped in try/catch so the test keeps
 * running even when individual steps fail. A results table is printed at the end.
 *
 * Each run creates a fresh Supabase user (email_confirm: true → no mail server needed).
 *
 * Run:
 *   npx playwright test e2e/deliverables-flow.spec.ts --headed
 *   npx playwright test e2e/deliverables-flow.spec.ts --reporter=html && npx playwright show-report
 */

import { test, expect, Page } from '@playwright/test'

// ── test data ─────────────────────────────────────────────────────────────────

const RUN_ID   = Date.now()
const EMAIL    = `test-syncflow-${RUN_ID}@pw.test`
const PASSWORD = 'TestPass123!'
const NAME     = 'PW Syncflow Founder'
const COMPANY  = 'Syncflow'

const ANSWERS = {
  s1: `We've completed 47 discovery interviews with operations managers at SaaS companies. Three are paying customers at $500/month ($1,500 MRR). Two have signed annual contracts worth $6,000 ACV. Retention is 100% after 12 months. Sales cycle averages 35 days from first call to signed contract. Every paying customer renewed automatically on first anniversary.`,

  s2: `TAM is 85,000 US operations managers at SaaS companies — $510M at $6k ACV. Market urgency is acute: SaaS stack complexity doubled in 2023 and ops teams are drowning in tool sprawl. Competitors: Zapier (requires technical setup, no ops-native workflows), Make.com (similar), and Workato (enterprise-only, $100k+ ACV). We are the only ops-native solution with zero technical setup, targeting the 50-200 person SaaS company that Zapier is too complex for and Workato is too expensive for. Expanding to EU in 18 months.`,

  s3: `No patents yet. Our moat is a proprietary connector library with 200+ SaaS integrations trained on ops workflow patterns from our beta cohort — no competitor has this dataset. A new entrant would need 18 months and $2M in integration development to replicate our connector depth. Technical team: CTO previously led integrations infrastructure at Workato. Build complexity is high: custom workflow DSL and runtime execution engine built from scratch.`,

  s4: `Founding team has 12 years combined SaaS operations experience. CEO spent 7 years running RevOps at two Series B SaaS companies and lived this problem daily. CTO built the integrations platform at Workato before leaving to solve this. Full-time team of 4: 2 engineers, 1 designer, 1 sales. Advisor: VP Operations at HubSpot with 30,000 employee scale experience.`,

  s5: `$1,500 MRR growing 25% month-over-month. Monthly burn $12,000. 18 months runway from pre-seed round. 80% gross margin — purely software, no services. Average deal size $6,000 ACV. LTV estimated at $18,000 based on 3-year average retention. CAC is currently $800 through founder-led sales.`,
}

// Context injected into Patel once before D1
const PATEL_CONTEXT =
  'We build Syncflow — workflow automation for ops teams at 50-200 person SaaS companies. ' +
  'Operations Managers are our buyer. Pain: manually syncing data between CRM, billing, and ' +
  'support tools wastes 5+ hours per week and causes missed revenue signals. We have 3 paying ' +
  'customers at $500/month ($1,500 MRR) who all matched this exact profile. Sales cycle 35 days.'

// All 3 clarifying signals embedded directly so Patel builds immediately
const BUILD_MESSAGES = {
  d1: 'Build my ICP. Target: Operations Managers at 50-200 person SaaS companies who waste 5+ hours/week on manual data sync between CRM, billing, and support tools. Pain: 40% of their time reconciling data. Customer signal: 3 paying customers at $500/month.',
  d2: 'Build D2 — Pains and Gains analysis for the Syncflow ICP.',
  d3: 'Build D3 — Buyer Journey map for this ICP.',
  d4: 'Build D4 — Positioning and Messaging for Syncflow.',
  d5: 'D1, D2, D3, D4 are all complete. Build D5 — Outreach Sequence targeting Operations Managers at SaaS companies now.',
  d6: 'All deliverables are complete. Build D6 — GTM Playbook for Syncflow now.',
}

// Keywords proving each inline viewer rendered structured content (not raw JSON)
const VIEWER_KEYWORDS: Record<string, string[]> = {
  d1: ['Segment', 'Persona', 'ICP', 'Target', 'Trigger'],
  d2: ['Pain', 'Core Pains', 'Trigger', 'Gain'],
  d3: ['Stage', 'Journey', 'Evaluation', 'Buyer'],
  d4: ['Positioning', 'Message', 'Foundation', 'Pillar'],
  d5: ['Step', 'Email', 'Day', 'sequence'],
  d6: ['Playbook', 'Phase', 'Channel', 'GTM'],
}

// ── result tracker ────────────────────────────────────────────────────────────

type StepStatus = 'PASS' | 'FAIL' | 'SKIP'
interface StepResult { step: string; status: StepStatus; detail: string }
const results: StepResult[] = []

async function run(label: string, fn: () => Promise<void>): Promise<boolean> {
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

function sendButton(page: Page) {
  return page
    .locator('div')
    .filter({ has: page.locator('textarea') })
    .last()
    .locator('button')
    .last()
}

async function answerSection(page: Page, sectionHeading: string, answer: string): Promise<void> {
  await page.waitForFunction(
    (h) => document.body.innerText.includes(h),
    sectionHeading,
    { timeout: 12_000 },
  )
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading question'),
    { timeout: 15_000 },
  )
  await page.waitForTimeout(1_000)
  await page.locator('textarea').last().fill(answer)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(14_000)

  const isComplete = await page
    .locator('body')
    .evaluate((el) => (el as HTMLElement).innerText.includes('Complete'))

  if (!isComplete) {
    await page.locator('textarea').last().fill(
      `Additional specifics: ${answer.slice(0, 300)} We have documented evidence and exact figures for all of the above.`
    )
    await page.keyboard.press('Enter')
    await page.waitForTimeout(14_000)
  }
}

/**
 * Request a deliverable and assert the inline viewer renders correctly.
 *
 * @param expectedArtifactCount — total number of "Document ready" cards that must
 *   exist after this deliverable generates (1 for D1, 2 for D2, …).
 *   This avoids the false-positive where an earlier card's "Document ready" text
 *   satisfies the wait condition before the new artifact has been generated.
 */
async function testDeliverable(
  page: Page,
  label: string,
  buildMessage: string,
  keywords: string[],
  expectedArtifactCount: number,
): Promise<boolean> {
  const sent = await run(`[Patel] ${label} — send build request`, async () => {
    await page.locator('textarea').first().fill(buildMessage)
    await sendButton(page).click()
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5_000 })
  })
  if (!sent) {
    skip(`[Patel] ${label} — artifact card`, 'Build request failed')
    skip(`[Patel] ${label} — inline viewer`, 'Build request failed')
    skip(`[Patel] ${label} — PDF button`, 'Build request failed')
    return false
  }

  const cardAppeared = await run(`[Patel] ${label} — artifact card appears`, async () => {
    // Wait until we have at least N "Document ready" cards visible in the chat.
    // Using a count avoids false positives where prior cards satisfy the check
    // before the newly-requested artifact has actually been generated.
    await page.waitForFunction(
      (n: number) => {
        const text = document.body.innerText ?? ''
        return (text.match(/Document ready/g) ?? []).length >= n
      },
      expectedArtifactCount,
      { timeout: 150_000 },
    )
  })
  if (!cardAppeared) {
    skip(`[Patel] ${label} — inline viewer`, 'Artifact card did not appear')
    skip(`[Patel] ${label} — PDF button`, 'Artifact card did not appear')
    return false
  }

  await run(`[Patel] ${label} — inline viewer renders structured content`, async () => {
    // Previously-expanded cards show "Collapse ↑". Only the newest unexpanded card
    // shows "View document ↓", so .last() naturally targets the new artifact.
    const viewBtn = page.locator('button').filter({ hasText: /View document/i }).last()
    await expect(viewBtn).toBeVisible({ timeout: 10_000 })
    await viewBtn.click()
    await page.waitForTimeout(1_500)
    const bodyText = await page.locator('body').innerText()
    if (bodyText.includes('"artifact_type"') || /^\s*\{/.test(bodyText)) {
      throw new Error('Raw JSON shown — renderer not mounting correctly')
    }
    const found = keywords.some(k => bodyText.includes(k))
    if (!found) throw new Error(`None of the expected keywords found: ${keywords.join(', ')}`)
  })

  await run(`[Patel] ${label} — PDF download button visible`, async () => {
    await expect(
      page.locator('button').filter({ hasText: /PDF/i }).last()
    ).toBeVisible({ timeout: 5_000 })
  })

  return true
}

// ── the test ──────────────────────────────────────────────────────────────────

test.describe('Syncflow — deliverables flow', () => {
  test.setTimeout(900_000) // 15 min: 6 LLM calls (~90s each) + profile builder (~5 min)

  test('signup → profile builder (all 5 sections) → Q-Score → Patel D1–D6', async ({ page }) => {

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
      await expect(page.locator('text=/Your startup/i').first()).toBeVisible({ timeout: 10_000 })
    })

    const step2Done = await run('[Signup] Step 2 — startup details', async () => {
      if (!step1Done) throw new Error('Skipped — step 1 failed')
      await page.locator('input[placeholder="e.g. Acme Inc."]').fill(COMPANY)
      await page.locator('button:has-text("AI & Software")').first().click()
      await page.locator('button:has-text("Product Development")').first().click()
      await page.locator('button:has-text("Continue")').first().click()
      await expect(page.locator('text=/Traction|Revenue/i').first()).toBeVisible({ timeout: 10_000 })
    })

    const step3Done = await run('[Signup] Step 3 — traction & team', async () => {
      if (!step2Done) throw new Error('Skipped — step 2 failed')
      await page.locator('button:has-text("Pre-revenue")').first().click()
      const pills = page.locator('button').filter({ hasText: /^1/ })
      await pills.first().click()
      await page.locator('button:has-text("Bootstrapped")').first().click()
      await page.locator('button:has-text("Continue")').first().click()
      await expect(page.locator('text=/problem|solving/i').first()).toBeVisible({ timeout: 10_000 })
    })

    const step4Done = await run('[Signup] Step 4 — problem & submit', async () => {
      if (!step3Done) throw new Error('Skipped — step 3 failed')
      await page.locator('textarea').first().fill(
        "Operations teams at SaaS startups waste 5+ hours every week manually copying data between tools because their systems don't talk to each other — causing errors, delays, and missed revenue signals."
      )
      await page.locator('input[placeholder*="Mid-market"]').fill(
        'Operations managers at 50-200 person Series A SaaS companies in the US'
      )
      await page.locator('button:has-text("Launch my profile")').click()
      await expect(page.locator('text=/Add your photo/i').first()).toBeVisible({ timeout: 25_000 })
    })

    const skipPhotoDone = await run('[Signup] Skip photo → profile builder', async () => {
      if (!step4Done) throw new Error('Skipped — step 4 failed')
      await page.locator('button:has-text("Skip for now")').click()
      await page.waitForURL(/profile-builder/, { timeout: 15_000 })
    })

    // ══════════════════════════════════════════════════════════════════
    // PHASE 2 — PROFILE BUILDER (all 5 sections)
    // ══════════════════════════════════════════════════════════════════

    const pbLoaded = await run('[Profile Builder] Page loads', async () => {
      if (!skipPhotoDone) throw new Error('Skipped — did not land on profile builder')
      await page.waitForLoadState('networkidle')
      // Use waitForFunction to be resilient against slow initial renders
      await page.waitForFunction(
        () => {
          const text = document.body.innerText ?? ''
          return (
            text.includes('Documents') ||
            text.includes('Upload') ||
            text.includes('Skip') ||
            text.includes('Section') ||
            document.querySelector('textarea') !== null ||
            document.querySelector('input[type="file"]') !== null
          )
        },
        { timeout: 25_000 },
      )
    })

    const skippedDocs = await run('[Profile Builder] Skip documents step', async () => {
      if (!pbLoaded) throw new Error('Skipped — profile builder did not load')
      const skipBtn = page.locator('button').filter({ hasText: /Skip.*question|Continue →/i }).first()
      await expect(skipBtn).toBeVisible({ timeout: 10_000 })
      await skipBtn.click()
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10_000 })
    })

    const skippedPitch = await run('[Profile Builder] Skip pitch step', async () => {
      if (!skippedDocs) throw new Error('Skipped — docs step failed')
      const nextBtn = page.locator('button').filter({ hasText: /^Next →$/ }).first()
      await expect(nextBtn).toBeVisible({ timeout: 10_000 })
      await nextBtn.click()
      await page.waitForFunction(
        () => document.body.innerText.includes('Market Validation'),
        { timeout: 10_000 },
      )
    })

    const s1Done = await run('[Profile Builder] Section 1 — Market Validation', async () => {
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

    const s2Done = await run('[Profile Builder] Section 2 — Market & Competition', async () => {
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

    const s3Done = await run('[Profile Builder] Section 3 — IP & Technology', async () => {
      if (!s2Advanced) throw new Error('Skipped — section 2 advance failed')
      await answerSection(page, 'IP & Technology', ANSWERS.s3)
    })

    const s3Advanced = await run('[Profile Builder] Advance to Section 4', async () => {
      if (!s3Done) throw new Error('Skipped — section 3 failed')
      await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
      await page.waitForFunction(
        () => document.body.innerText.includes('Team'),
        { timeout: 10_000 },
      )
    })

    const s4Done = await run('[Profile Builder] Section 4 — Team', async () => {
      if (!s3Advanced) throw new Error('Skipped — section 3 advance failed')
      await answerSection(page, 'Team', ANSWERS.s4)
    })

    const s4Advanced = await run('[Profile Builder] Advance to Section 5', async () => {
      if (!s4Done) throw new Error('Skipped — section 4 failed')
      await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
      await page.waitForFunction(
        () => document.body.innerText.includes('Financials') || document.body.innerText.includes('Impact'),
        { timeout: 10_000 },
      )
    })

    const s5Done = await run('[Profile Builder] Section 5 — Financials', async () => {
      if (!s4Advanced) throw new Error('Skipped — section 4 advance failed')
      await answerSection(page, 'Financials', ANSWERS.s5)
    })

    const reachedStep6 = await run('[Profile Builder] Navigate to Review & Submit', async () => {
      if (!s5Done) throw new Error('Skipped — section 5 failed')
      for (let i = 0; i < 3; i++) {
        const btn = page.locator('button').filter({ hasText: /Next →|Review & Submit →/ }).first()
        const visible = await btn.isVisible({ timeout: 3_000 }).catch(() => false)
        if (!visible) break
        await btn.click()
        await page.waitForTimeout(1_200)
      }
      await expect(
        page.locator('button').filter({ hasText: /Calculate My Q-Score/i }).first()
      ).toBeVisible({ timeout: 10_000 })
    })

    const qScoreCalculated = await run('[Profile Builder] Calculate Q-Score', async () => {
      if (!reachedStep6) throw new Error('Skipped — did not reach Review & Submit')
      const btn = page.locator('button').filter({ hasText: /Calculate My Q-Score/i }).first()
      const disabled = await btn.getAttribute('disabled')
      if (disabled !== null) {
        const bodyText = await page.locator('body').innerText()
        const completedMatch = bodyText.match(/(\d+)\/5 sections complete/)
        throw new Error(
          `Calculate button disabled — ` +
          (completedMatch ? completedMatch[0] : 'Could not parse section count')
        )
      }
      await btn.click()
      await expect(
        page.locator('text=/Q-Score|Grade|score/i').first()
      ).toBeVisible({ timeout: 40_000 })
    })

    // ══════════════════════════════════════════════════════════════════
    // PHASE 3 — PATEL + D1–D6 DELIVERABLES
    // ══════════════════════════════════════════════════════════════════

    const patelLoaded = await run('[Patel] Navigate to /founder/cxo/patel', async () => {
      await page.goto('/founder/cxo/patel')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15_000 })
    })

    // Provide company context so Patel has all signals for immediate D1 build
    await run('[Patel] Provide Syncflow company context', async () => {
      if (!patelLoaded) throw new Error('Skipped — Patel workspace did not load')
      await page.waitForFunction(
        () => document.body.innerText.includes('?') || document.body.innerText.includes('ready'),
        { timeout: 30_000 },
      )
      await page.locator('textarea').first().fill(PATEL_CONTEXT)
      await sendButton(page).click()
      await page.waitForTimeout(15_000)
    })

    if (!patelLoaded) {
      for (const label of ['D1 ICP', 'D2 Pains & Gains', 'D3 Buyer Journey', 'D4 Positioning', 'D5 Outreach', 'D6 Playbook']) {
        skip(`[Patel] ${label} — send build request`, 'Patel workspace did not load')
        skip(`[Patel] ${label} — artifact card`, 'Patel workspace did not load')
        skip(`[Patel] ${label} — inline viewer`, 'Patel workspace did not load')
        skip(`[Patel] ${label} — PDF button`, 'Patel workspace did not load')
      }
    } else {
      // expectedArtifactCount = cumulative total of "Document ready" cards that should
      // exist after each deliverable is generated (1 for D1, 2 for D2, …)
      await testDeliverable(page, 'D1 ICP',          BUILD_MESSAGES.d1, VIEWER_KEYWORDS.d1, 1)
      await testDeliverable(page, 'D2 Pains & Gains', BUILD_MESSAGES.d2, VIEWER_KEYWORDS.d2, 2)
      await testDeliverable(page, 'D3 Buyer Journey', BUILD_MESSAGES.d3, VIEWER_KEYWORDS.d3, 3)
      await testDeliverable(page, 'D4 Positioning',   BUILD_MESSAGES.d4, VIEWER_KEYWORDS.d4, 4)
      await testDeliverable(page, 'D5 Outreach',      BUILD_MESSAGES.d5, VIEWER_KEYWORDS.d5, 5)
      await testDeliverable(page, 'D6 Playbook',      BUILD_MESSAGES.d6, VIEWER_KEYWORDS.d6, 6)
    }

    // ══════════════════════════════════════════════════════════════════
    // PHASE 4 — SUMMARY
    // ══════════════════════════════════════════════════════════════════

    const passed  = results.filter(r => r.status === 'PASS').length
    const failed  = results.filter(r => r.status === 'FAIL').length
    const skipped = results.filter(r => r.status === 'SKIP').length

    console.log('\n\n══════════════════════════════════════════════════════════')
    console.log(`  SYNCFLOW DELIVERABLES FLOW — DIAGNOSTIC RESULTS`)
    console.log(`  Email:   ${EMAIL}`)
    console.log(`  Company: ${COMPANY}`)
    console.log(`  Run:     ${new Date().toISOString()}`)
    console.log('══════════════════════════════════════════════════════════')
    console.table(results)
    console.log(`  PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}`)
    console.log('══════════════════════════════════════════════════════════\n')

    test.info().annotations.push({
      type: 'diagnostic-results',
      description: JSON.stringify({ passed, failed, skipped, email: EMAIL, company: COMPANY }),
    })

    const summary = results
      .map(r => `${r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭'} ${r.step}${r.detail ? ` — ${r.detail}` : ''}`)
      .join('\n')
    await test.info().attach('diagnostic-summary.txt', {
      body: Buffer.from(summary),
      contentType: 'text/plain',
    })

    if (!qScoreCalculated) {
      console.warn('[warn] Q-Score was not calculated — Patel context may be thin')
    }

    if (failed > 0) {
      const failedSteps = results
        .filter(r => r.status === 'FAIL')
        .map(r => `  • ${r.step}: ${r.detail}`)
        .join('\n')
      throw new Error(`${failed} step(s) failed:\n${failedSteps}`)
    }
  })
})

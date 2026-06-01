/**
 * GTM Playbook Harvest — Nudge (single company)
 *
 * 1. Create account via API
 * 2. Complete 5-section profile builder
 * 3. Drive Patel D1 → D2 → D3 → D4 → D5 → D6
 * 4. Save GTM Playbook as PDF
 *
 * Run:
 *   npx playwright test e2e/gtm-harvest-one.spec.ts --headed
 *
 * Output: e2e/gtm-playbooks/nudge.pdf
 */

import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { createFounderAccount, signInWithCredentials } from './helpers/auth'

const OUTPUT_DIR = path.join(__dirname, 'gtm-playbooks')
const PDF_PATH   = path.join(OUTPUT_DIR, 'nudge.pdf')

// ── Company data ───────────────────────────────────────────────────────────────

const CO = {
  name:             'Nudge',
  industryValue:    'ai-software',
  problemStatement: 'PLG SaaS companies lose 60-70% of activated users before they convert to paid because in-app onboarding is generic and does not respond to individual user behaviour.',
  targetCustomer:   'Product Managers at B2B SaaS companies with 100-500 employees using a product-led growth motion',

  answers: {
    s1: 'We ran 41 discovery interviews with Product Managers and Growth leads at PLG SaaS companies. We have 5 paying customers at $800 per month — $4,000 MRR. All five signed annual contracts at $9,600 ACV. 94% gross retention after 12 months. Sales cycle 24 days from first demo to signed contract. Every customer we have spoken to said their biggest bottleneck is that activated users who hit the aha-moment still churn before paying because follow-up nudges are too generic.',
    s2: 'TAM: 28,000 US SaaS companies using a PLG motion with 100-500 employees = $268M at $9,600 ACV. Competitors: Appcues (UI overlays only, no behavioural logic), Intercom (chat-first, not nudge-native), Pendo (analytics-first, nudges are a bolt-on). We are the only platform that uses real-time product telemetry to trigger personalised in-app nudges within the activation flow — no competitor does behavioural sequencing across the full free-to-paid conversion funnel.',
    s3: 'Proprietary behavioural scoring engine trained on 14 million anonymised product events from our beta cohort — predicts drop-off 48 hours in advance with 81% accuracy. No patent yet. Integration with Segment, Mixpanel, and Amplitude required 14 months of data-pipeline work. CTO was previously staff engineer on the growth infrastructure team at Notion. Replication barrier: the training data and integration depth would take a new entrant 18-24 months to match.',
    s4: 'CEO spent 5 years as Head of Growth at two PLG SaaS companies — personally felt the gap between activation and conversion every quarter. CTO led growth data infrastructure at Notion for 3 years. Head of Product joined from Amplitude. Four full-time founders and two engineers. No outside investors — entirely bootstrapped to $4,000 MRR.',
    s5: '$4,000 MRR growing 28% month-over-month for 3 consecutive months. $9,000 per month burn. 22 months runway. 87% gross margin. $9,600 ACV. LTV $28,800 at 3-year average retention. CAC $1,100 via founder-led outreach on LinkedIn and Slack communities. No paid marketing.',
  },

  // Context + D1 merged into ONE message — Patel processes everything in a single turn
  d1Message: `Company context: We build Nudge — a behavioural nudge automation platform for PLG SaaS teams. Our buyer is the Product Manager at 100-500 person SaaS companies running a product-led growth motion. Core pain: 60-70% of activated users never convert to paid because in-app onboarding is generic and ignores real-time behaviour. We have 5 paying customers at $800/month ($4K MRR), all on annual contracts, 94% gross retention, 24-day sales cycle.

Build D1 — ICP Definition for Nudge.
Buyer: Product Managers at B2B SaaS companies (100-500 employees) with a PLG motion.
Pain: activated users churning before converting to paid due to generic onboarding nudges.
Customer signal: 5 paying customers at $800/month, 94% retention, 24-day sales cycle.
All three required signals are present. Proceed and build D1 now.`,
}

// ── Result tracker ─────────────────────────────────────────────────────────────

type Status = 'PASS' | 'FAIL' | 'SKIP'
const results: Array<{ step: string; status: Status; detail: string }> = []

async function run(label: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn()
    results.push({ step: label, status: 'PASS', detail: '' })
    console.log(`  ✅ ${label}`)
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err)
    results.push({ step: label, status: 'FAIL', detail: msg.slice(0, 120) })
    console.log(`  ❌ ${label} — ${msg.slice(0, 100)}`)
    return false
  }
}

function skip(label: string, reason: string) {
  results.push({ step: label, status: 'SKIP', detail: reason })
  console.log(`  ⏭️  ${label} — ${reason}`)
}

function printSummary() {
  const p = results.filter(r => r.status === 'PASS').length
  const f = results.filter(r => r.status === 'FAIL').length
  const s = results.filter(r => r.status === 'SKIP').length
  console.log('\n══════════════════════════════════════════════════════════')
  console.log(`  NUDGE GTM HARVEST  |  ✅ ${p}  ❌ ${f}  ⏭ ${s}`)
  console.log('══════════════════════════════════════════════════════════\n')
}

// ── Page helpers ───────────────────────────────────────────────────────────────

const sendBtn = (page: Page) =>
  page.locator('div').filter({ has: page.locator('textarea') }).last().locator('button').last()

async function clearAndSend(page: Page, message: string): Promise<void> {
  await page.locator('textarea').first().fill(message)
  await sendBtn(page).click()
  // Wait for textarea to clear (message submitted)
  await page.waitForFunction(
    () => {
      const ta = document.querySelector('textarea') as HTMLTextAreaElement | null
      return !ta || ta.value.trim() === ''
    },
    { timeout: 10_000 },
  )
}

async function answerSection(page: Page, heading: string, answer: string): Promise<void> {
  await page.waitForFunction(
    (h: string) => document.body.innerText.includes(h),
    heading,
    { timeout: 12_000 },
  )
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading question'),
    { timeout: 15_000 },
  )
  await page.waitForTimeout(800)
  await page.locator('textarea').last().fill(answer)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(14_000)
  const complete = await page.evaluate(() => document.body.innerText.includes('Complete'))
  if (!complete) {
    await page.locator('textarea').last().fill(
      `Additional specifics: ${answer.slice(0, 300)} All figures are verified and documented.`,
    )
    await page.keyboard.press('Enter')
    await page.waitForTimeout(14_000)
  }
}

/**
 * Send a Patel build request and wait for the artifact card.
 * If Patel asks a clarifying question, reply once with "proceed".
 */
async function buildDeliverable(
  page: Page,
  label: string,
  message: string,
  expectedDocCount: number,
  keywords: string[],
): Promise<boolean> {

  const sent = await run(`[Patel] ${label} — send`, async () => {
    await clearAndSend(page, message)
  })
  if (!sent) {
    skip(`[Patel] ${label} — artifact`, 'send failed')
    skip(`[Patel] ${label} — viewer`,   'send failed')
    return false
  }

  // Wait for artifact card — detect questions anywhere in the page and reply up to twice
  const gotCard = await run(`[Patel] ${label} — artifact card`, async () => {
    const deadline  = Date.now() + 10 * 60_000   // 10-minute hard cap
    let proceedsSent = 0
    let lastBodyLen  = 0

    while (Date.now() < deadline) {
      await page.waitForTimeout(5_000)

      const body     = await page.evaluate(() => document.body.innerText ?? '')
      const docCount = (body.match(/Document ready/g) ?? []).length

      if (docCount >= expectedDocCount) return  // ✅ artifact appeared

      // Only act when the page has new content (Patel responded)
      if (body.length > lastBodyLen + 100) {
        lastBodyLen = body.length

        // If Patel asked a question anywhere on the page, reply with "proceed"
        // Allow up to 2 proceed replies (Patel's rule: build after ≤2 exchanges)
        if (proceedsSent < 2 && body.includes('?')) {
          proceedsSent++
          await clearAndSend(page,
            'All information has been provided. The team has reviewed the ICP and we have done initial outbound testing with positive signal. Proceed and build this deliverable now — do not ask any more questions.',
          )
        }
      }
    }
    throw new Error('Artifact did not appear within 10 minutes')
  })
  if (!gotCard) {
    skip(`[Patel] ${label} — viewer`, 'artifact did not appear')
    return false
  }

  // Verify the inline viewer renders real content (not raw JSON)
  await run(`[Patel] ${label} — viewer`, async () => {
    const viewBtn = page.locator('button').filter({ hasText: /View document/i }).last()
    await expect(viewBtn).toBeVisible({ timeout: 10_000 })
    await viewBtn.click()
    await page.waitForTimeout(1_500)
    const body = await page.evaluate(() => document.body.innerText ?? '')
    if (body.includes('"artifact_type"')) throw new Error('Raw JSON visible')
    if (!keywords.some(k => body.includes(k))) throw new Error(`Keywords not found: ${keywords.join(', ')}`)
  })

  return true
}

// ── The test ───────────────────────────────────────────────────────────────────

test('Nudge — end-to-end GTM Playbook', async ({ page, context }) => {
  test.setTimeout(1_800_000)  // 30 min

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`\n📂 Output: ${PDF_PATH}\n`)

  // ════════════════════════════════════════════
  // PHASE 1 — ACCOUNT + SIGN IN
  // ════════════════════════════════════════════

  const signedIn = await run('[Account] Create via API + sign in', async () => {
    const acct = await createFounderAccount({
      companyName:      CO.name,
      industry:         CO.industryValue,
      problemStatement: CO.problemStatement,
      targetCustomer:   CO.targetCustomer,
    })
    await signInWithCredentials(page, acct.email, acct.password)
    console.log(`  → signed in as ${acct.email}`)
  })

  const pbReady = await run('[Account] Go to profile builder', async () => {
    if (!signedIn) throw new Error('Sign in failed')
    await page.goto('/founder/profile-builder')
    await page.waitForLoadState('networkidle')
  })

  // ════════════════════════════════════════════
  // PHASE 2 — PROFILE BUILDER
  // ════════════════════════════════════════════

  const pbLoaded = await run('[PB] Page loaded', async () => {
    if (!pbReady) throw new Error('Did not reach profile builder')
    await page.waitForFunction(
      () => {
        const t = document.body.innerText ?? ''
        return t.includes('Documents') || t.includes('Skip') || !!document.querySelector('textarea')
      },
      { timeout: 25_000 },
    )
  })

  const docsDone = await run('[PB] Skip documents', async () => {
    if (!pbLoaded) throw new Error('PB not loaded')
    const btn = page.locator('button').filter({ hasText: /Skip.*question|Continue →/i }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10_000 })
  })

  const pitchDone = await run('[PB] Skip pitch', async () => {
    if (!docsDone) throw new Error('Docs step failed')
    const btn = page.locator('button').filter({ hasText: /^Next →$/ }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()
    await page.waitForFunction(() => document.body.innerText.includes('Market Validation'), { timeout: 10_000 })
  })

  const s1ok = await run('[PB] S1 Market Validation', async () => {
    if (!pitchDone) throw new Error('Pitch skip failed')
    await answerSection(page, 'Market Validation', CO.answers.s1)
  })
  const s1adv = await run('[PB] → S2', async () => {
    if (!s1ok) throw new Error('S1 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(() => document.body.innerText.includes('Market & Competition'), { timeout: 10_000 })
  })

  const s2ok = await run('[PB] S2 Market & Competition', async () => {
    if (!s1adv) throw new Error('S1 advance failed')
    await answerSection(page, 'Market & Competition', CO.answers.s2)
  })
  const s2adv = await run('[PB] → S3', async () => {
    if (!s2ok) throw new Error('S2 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(
      () => document.body.innerText.includes('IP & Technology') || document.body.innerText.includes('Defensibility'),
      { timeout: 10_000 },
    )
  })

  const s3ok = await run('[PB] S3 IP & Technology', async () => {
    if (!s2adv) throw new Error('S2 advance failed')
    await answerSection(page, 'IP & Technology', CO.answers.s3)
  })
  const s3adv = await run('[PB] → S4', async () => {
    if (!s3ok) throw new Error('S3 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(() => document.body.innerText.includes('Team'), { timeout: 10_000 })
  })

  const s4ok = await run('[PB] S4 Team', async () => {
    if (!s3adv) throw new Error('S3 advance failed')
    await answerSection(page, 'Team', CO.answers.s4)
  })
  const s4adv = await run('[PB] → S5', async () => {
    if (!s4ok) throw new Error('S4 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(
      () => document.body.innerText.includes('Financials') || document.body.innerText.includes('Impact'),
      { timeout: 10_000 },
    )
  })

  const s5ok = await run('[PB] S5 Financials', async () => {
    if (!s4adv) throw new Error('S4 advance failed')
    await answerSection(page, 'Financials', CO.answers.s5)
  })

  const atSubmit = await run('[PB] Reach Review & Submit', async () => {
    if (!s5ok) throw new Error('S5 failed')
    for (let i = 0; i < 3; i++) {
      const btn = page.locator('button').filter({ hasText: /Next →|Review & Submit →/ }).first()
      if (!await btn.isVisible({ timeout: 3_000 }).catch(() => false)) break
      await btn.click()
      await page.waitForTimeout(1_200)
    }
    await expect(page.locator('button').filter({ hasText: /Calculate My Q-Score/i }).first()).toBeVisible({ timeout: 10_000 })
  })

  await run('[PB] Calculate Q-Score', async () => {
    if (!atSubmit) throw new Error('Did not reach submit')
    const btn = page.locator('button').filter({ hasText: /Calculate My Q-Score/i }).first()
    if (await btn.getAttribute('disabled') !== null) {
      const body = await page.evaluate(() => document.body.innerText)
      const m = body.match(/(\d+)\/5 sections complete/)
      throw new Error(`Disabled — ${m?.[0] ?? 'check sections'}`)
    }
    await btn.click()
    await expect(page.locator('text=/Q-Score|Grade|score/i').first()).toBeVisible({ timeout: 40_000 })
  })

  // ════════════════════════════════════════════
  // PHASE 3 — PATEL D1 → D6
  // ════════════════════════════════════════════

  const patelOk = await run('[Patel] Open workspace', async () => {
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 20_000 })
    // Wait for Patel's opening message to render
    await page.waitForFunction(
      () => (document.body.innerText ?? '').length > 200,
      { timeout: 30_000 },
    )
  })

  if (!patelOk) {
    for (const d of ['D1 ICP', 'D2 Pains & Gains', 'D3 Buyer Journey', 'D4 Positioning', 'D5 Outreach', 'D6 GTM Playbook']) {
      skip(`[Patel] ${d} — send`, 'workspace failed')
      skip(`[Patel] ${d} — artifact card`, 'workspace failed')
      skip(`[Patel] ${d} — viewer`, 'workspace failed')
    }
  } else {
    // D1 — context + build request in ONE message (no separate context turn)
    await buildDeliverable(page, 'D1 ICP', CO.d1Message, 1, ['Segment', 'Persona', 'ICP', 'Target'])

    // D2 — answers Patel's mandatory post-D1 question ("has team seen ICP / tested outbound?")
    await buildDeliverable(page, 'D2 Pains & Gains',
      'D1 ICP is complete. Yes — the team has reviewed it and we have tested the ICP with initial LinkedIn outbound (positive signal). Build D2 — Pains, Gains and Triggers analysis for the Nudge ICP. Proceed and build D2 now.',
      2, ['Pain', 'Gain', 'Trigger'])

    await buildDeliverable(page, 'D3 Buyer Journey',
      'D1 and D2 are complete. Build D3 — Buyer Journey map for the Nudge ICP. Proceed and build D3 now.',
      3, ['Stage', 'Journey', 'Evaluation', 'Buyer'])

    await buildDeliverable(page, 'D4 Positioning',
      'D1, D2, D3 are complete. Build D4 — Positioning and Messaging for Nudge. Proceed and build D4 now.',
      4, ['Positioning', 'Message', 'Pillar'])

    await buildDeliverable(page, 'D5 Outreach',
      'D1 through D4 are complete. Build D5 — Outreach Sequence for the Nudge ICP. Proceed and build D5 now.',
      5, ['Step', 'Email', 'Day'])

    await buildDeliverable(page, 'D6 GTM Playbook',
      'All deliverables D1 through D5 are complete. Build D6 — the full GTM Playbook for Nudge. Proceed and build D6 now.',
      6, ['Playbook', 'Phase', 'Channel', 'GTM'])
  }

  // ════════════════════════════════════════════
  // PHASE 4 — SAVE PDF
  // ════════════════════════════════════════════

  await run('[PDF] Save nudge.pdf', async () => {
    const pdfBtn = page.locator('button').filter({ hasText: /PDF/i }).last()
    await expect(pdfBtn).toBeVisible({ timeout: 10_000 })

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      pdfBtn.click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.evaluate(() => { window.print = () => {} })
    await popup.pdf({
      path: PDF_PATH,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    })
    await popup.close()

    const { size } = fs.statSync(PDF_PATH)
    if (size < 10_000) throw new Error(`PDF too small (${size} bytes) — likely empty`)
    console.log(`\n📄 Saved: ${PDF_PATH} (${Math.round(size / 1024)} KB)\n`)
  })

  printSummary()
})

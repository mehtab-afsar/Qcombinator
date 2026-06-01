/**
 * GTM Playbook Harvest — SpendIQ
 *
 * SpendIQ: real-time spend analytics for CFOs at 50-500 person SaaS companies.
 *
 * 1. Create account via API
 * 2. Complete 5-section profile builder
 * 3. Drive Patel D1 → D2 → D3 → D4 → D5 → D6 (GTM Playbook)
 * 4. Save GTM Playbook as PDF
 *
 * Run:
 *   npx playwright test e2e/gtm-harvest-spendiq.spec.ts --headed
 *
 * Output: e2e/gtm-playbooks/spendiq.pdf
 */

import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { createFounderAccount, signInWithCredentials } from './helpers/auth'

const OUTPUT_DIR = path.join(__dirname, 'gtm-playbooks')
const PDF_PATH   = path.join(OUTPUT_DIR, 'spendiq.pdf')

// ── Company data ───────────────────────────────────────────────────────────────

const CO = {
  name:             'SpendIQ',
  industryValue:    'ai-software',
  problemStatement: 'CFOs and Finance Directors at 50-500 person SaaS companies wait 2-3 weeks for month-end financial close and cannot prevent budget overruns in real time because their spend data is fragmented across cards, banks, and ERPs.',
  targetCustomer:   'CFOs and Finance Directors at B2B SaaS companies with 50-500 employees who need real-time spend visibility without switching payment providers',

  answers: {
    s1: '38 discovery interviews with CFOs and Finance Directors at B2B SaaS companies. 8 paying customers at average $1,875 per month — $15,000 MRR. 3 signed annual contracts at $18,000 ACV. 89% gross retention. Sales cycle 28 days from first demo to signed contract. Every churned customer left due to acquisition — not dissatisfaction. Core insight from interviews: finance teams waste 2-3 weeks on month-end close because spend data sits in six different places — credit cards, bank accounts, payroll, Stripe, Brex, and the ERP.',
    s2: 'TAM: 45,000 US SaaS companies with 50-500 employees = $270M at $6,000 ACV. Competitors: Ramp (requires switching to their credit card — 80% of prospects reject this), Expensify (expense reports only, backward-looking, no real-time visibility), month-end Excel (80% of the market — our real competitor). We are the only real-time spend analytics platform that connects to all existing payment methods simultaneously. No card switching, works with Stripe, Brex, Ramp, and bank accounts all at once. No competitor offers cross-provider real-time visibility.',
    s3: 'Proprietary spend categorization engine trained on $2.3 billion in real transaction data from our beta cohort — 97% categorization accuracy versus 78% industry average from competitors. Integrations with 35 finance tools including QuickBooks, Xero, NetSuite, Stripe, Brex. CTO previously built transaction processing infrastructure at Stripe — that is how we achieved Stripe-grade data reliability. Integration depth required 24 months to build. No patent yet.',
    s4: 'CEO spent 6 years as CFO at two SaaS companies — both exited — and personally lived the month-end close pain every quarter for 6 years. CTO built payments systems at Stripe. Head of Sales joined from Ramp with $5M quota attainment in prior role. 4 full-time founders and first hires. No external investors yet — entirely bootstrapped.',
    s5: '$15,000 MRR growing 30% month-over-month for 4 consecutive months. $18,000 per month burn. 16 months runway from angel round. 91% gross margin. $12,000 ACV. LTV $36,000 at 3-year average retention. CAC $600 via LinkedIn outreach — entirely founder-led sales. No paid marketing spend.',
  },

  d1Message: `Company context: We build SpendIQ — real-time spend analytics for CFOs at 50-500 person SaaS companies. The buyer is the CFO or Finance Director. Core pain: finance teams wait 2-3 weeks for month-end close and cannot prevent budget overruns in real time because spend data is fragmented across Stripe, Brex, Ramp, bank accounts, and the ERP — no single tool gives them live visibility without forcing a card switch. We have 8 paying customers at an average of $1,875 per month ($15K MRR), 30% MoM growth for 4 consecutive months, 89% gross retention, 28-day sales cycle.

Build D1 — ICP Definition for SpendIQ.
Buyer: CFOs and Finance Directors at B2B SaaS companies (50-500 employees).
Pain: 2-3 week month-end close delay and inability to prevent budget overruns in real time due to fragmented spend data across multiple payment providers.
Customer signal: 8 paying customers at $15K MRR, 30% MoM growth, 89% retention, 28-day sales cycle.
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
  console.log(`  SPENDIQ GTM HARVEST  |  ✅ ${p}  ❌ ${f}  ⏭ ${s}`)
  console.log('══════════════════════════════════════════════════════════\n')
}

// ── Page helpers ───────────────────────────────────────────────────────────────

const sendBtn = (page: Page) =>
  page.locator('div').filter({ has: page.locator('textarea') }).last().locator('button').last()

async function clearAndSend(page: Page, message: string): Promise<void> {
  await page.locator('textarea').first().fill(message)
  await sendBtn(page).click()
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

  const gotCard = await run(`[Patel] ${label} — artifact card`, async () => {
    const deadline  = Date.now() + 18 * 60_000   // 18-minute hard cap per deliverable
    let proceedsSent = 0

    // Seed baseline AFTER the send so we only react to Patel's NEW responses,
    // not to existing page content (which always contains '?' in nav/greeting).
    let lastBodyLen = (await page.evaluate(() => document.body.innerText?.length ?? 0))

    // Give Patel 20 seconds to start generating before we check anything.
    await page.waitForTimeout(20_000)

    while (Date.now() < deadline) {
      await page.waitForTimeout(6_000)

      const body     = await page.evaluate(() => document.body.innerText ?? '')
      const docCount = (body.match(/Document ready/g) ?? []).length

      if (docCount >= expectedDocCount) return  // artifact appeared

      // Only react when Patel has added substantial new content
      if (body.length > lastBodyLen + 300) {
        lastBodyLen = body.length

        // Extract only the tail of the page (last ~2000 chars = Patel's latest reply)
        const tail = body.slice(-2000)
        if (proceedsSent < 2 && tail.includes('?')) {
          proceedsSent++
          await clearAndSend(page,
            'All information has been provided. The team has reviewed the ICP and we have done initial outbound testing with positive signal. Proceed and build this deliverable now — do not ask any more questions.',
          )
        }
      }
    }
    throw new Error(`Artifact did not appear within 18 minutes (expected ${expectedDocCount} "Document ready")`)
  })
  if (!gotCard) {
    skip(`[Patel] ${label} — viewer`, 'artifact did not appear')
    return false
  }

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

test('SpendIQ — end-to-end GTM Playbook', async ({ page, context }) => {
  test.setTimeout(2_700_000)  // 45 min

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
    await buildDeliverable(page, 'D1 ICP', CO.d1Message, 1, ['Segment', 'Persona', 'ICP', 'Target'])

    await buildDeliverable(page, 'D2 Pains & Gains',
      'D1 ICP is complete. Yes — the team has reviewed it and we have done initial outbound testing on LinkedIn with positive signal from CFOs. Build D2 — Pains, Gains and Triggers analysis for the SpendIQ ICP. Proceed and build D2 now.',
      2, ['Pain', 'Gain', 'Trigger'])

    await buildDeliverable(page, 'D3 Buyer Journey',
      'D1 and D2 are complete. Build D3 — Buyer Journey map for the SpendIQ ICP. Proceed and build D3 now.',
      3, ['Stage', 'Journey', 'Evaluation', 'Buyer'])

    await buildDeliverable(page, 'D4 Positioning',
      'D1, D2, D3 are complete. Build D4 — Positioning and Messaging for SpendIQ. Proceed and build D4 now.',
      4, ['Positioning', 'Message', 'Pillar'])

    await buildDeliverable(page, 'D5 Outreach',
      'D1 through D4 are complete. Build D5 — Outreach Sequence for the SpendIQ ICP. Proceed and build D5 now.',
      5, ['Step', 'Email', 'Day', 'Sequence'])

    await buildDeliverable(page, 'D6 GTM Playbook',
      'All deliverables D1 through D5 are complete. Build D6 — the full GTM Playbook for SpendIQ. Proceed and build D6 now.',
      6, ['Playbook', 'Phase', 'Channel', 'GTM'])
  }

  // ════════════════════════════════════════════
  // PHASE 4 — SAVE PDF
  // ════════════════════════════════════════════

  await run('[PDF] Save spendiq.pdf', async () => {
    // Find the last PDF button (will be on the GTM Playbook card)
    const pdfBtn = page.locator('button').filter({ hasText: /PDF/i }).last()
    await expect(pdfBtn).toBeVisible({ timeout: 15_000 })

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

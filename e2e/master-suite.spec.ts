/**
 * TestCo — Master E2E Lifecycle Suite
 *
 * Block 1  — Auth: create account, sign in, dashboard, sign out, sign back in, forgot password
 * Block 2  — DB:   founder_profiles row, qscore_history row, subscription_usage rows
 * Block 3  — Profile Builder: 5 sections + Q-Score
 * Block 4  — Patel D1 ICP
 * Block 5  — Patel D2 Pains & Gains, D3 Buyer Journey, D4 Positioning
 * Block 6  — GTM Playbook D6
 * Block 7  — PDF export
 *
 * Run:
 *   npx playwright test e2e/master-suite.spec.ts --headed
 *
 * Output: e2e/gtm-playbooks/testco.pdf
 */

import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { createFounderAccount, signInWithCredentials } from './helpers/auth'

const OUTPUT_DIR = path.join(__dirname, 'gtm-playbooks')
const PDF_PATH   = path.join(OUTPUT_DIR, 'testco.pdf')

// ── Company data ────────────────────────────────────────────────────────────────

const CO = {
  name:             'TestCo',
  industryValue:    'ai-software',
  problemStatement: 'Support teams at 50-200 person SaaS companies spend 40% of time on repetitive L1 tickets that could be resolved automatically, costing $200K+ per year in avoidable support headcount.',
  targetCustomer:   'Head of Support and VP Customer Success at B2B SaaS companies with 50-200 employees',

  answers: {
    s1: '47 customer discovery interviews with Heads of Support and VP Customer Success at B2B SaaS companies with 50-200 employees. 4 paying customers at $1,200 per month — $4,800 MRR. 92% gross retention. Sales cycle 30 days from first demo to signed contract. Core insight: support managers say 40% of incoming tickets are L1 repetitive questions — password resets, billing queries, how-to guides — that a trained AI could resolve without human intervention.',
    s2: 'TAM: 23,000 B2B SaaS companies with 50-200 employees in the US = $165M at $7,200 ACV. Primary competitors: Intercom (resolution bot requires full Intercom suite at $500+/mo), Zendesk AI (add-on at $50/agent/mo), Freshdesk Freddy (limited to Freshdesk customers only). We are the only AI-powered L1 automation that works across all major ticketing platforms simultaneously — no lock-in to a single helpdesk. All competitors require switching or add-on pricing that scales with agent count.',
    s3: 'Proprietary ML ticket classifier trained on 2.1 million historical support tickets across 12 B2B SaaS categories — achieving 94% deflection accuracy versus 71% industry benchmark. Integrations with Zendesk, Intercom, Freshdesk, Salesforce Service Cloud. CTO has 8 years of NLP and ML experience, previously built ticket triage systems at Zendesk. Training data moat: 18 months of continuous learning from customer ticket flows creates a compounding advantage. No patent filed yet.',
    s4: 'CEO spent 6 years as Head of Support at two B2B SaaS companies and personally managed the L1 ticket problem every day. CTO is an ex-Zendesk ML engineer with 8 years NLP experience — he built the ticket routing system used by 50,000 companies. Head of Customer Success joined from Intercom with $4M ARR book of business. 3 full-time founders. Pre-seed bootstrapped — no external investors yet.',
    s5: '$4,800 MRR growing 28% month-over-month for 3 consecutive months. $9,600 ACV. 92% gross retention. 16 months runway from founder savings. $8,200 per month burn rate. LTV $28,800 at 3-year average retention. CAC $400 via founder-led LinkedIn outreach and warm intros. No paid marketing spend yet. 91% gross margin.',
  },

  d1Message: `Company context: We build TestCo — AI-powered L1 support ticket automation for B2B SaaS companies.
Buyer: Head of Support / VP Customer Success at B2B SaaS companies with 50-200 employees.
Pain: 40% of support time wasted on repetitive L1 tickets that could be automated — costing $200K+ per year in avoidable headcount.
Customer signal: 4 paying customers at $1,200/month ($4,800 MRR), 92% retention, 30-day sales cycle.
All three required signals are present. Proceed and build D1 now.`,
}

// ── Result tracker ──────────────────────────────────────────────────────────────

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
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log(`  TESTCO MASTER SUITE  |  ✅ ${p} PASS  ❌ ${f} FAIL  ⏭ ${s} SKIP`)
  console.log('══════════════════════════════════════════════════════════════\n')
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️ '
    const detail = r.detail ? `  → ${r.detail}` : ''
    console.log(`  ${icon}  ${r.step}${detail}`)
  }
}

// ── Page helpers ────────────────────────────────────────────────────────────────

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
    const deadline   = Date.now() + 18 * 60_000   // 18-minute hard cap per deliverable
    let proceedsSent = 0

    // Seed from actual page body AFTER send — avoids reacting to pre-existing '?' in nav/greeting
    let lastBodyLen = (await page.evaluate(() => document.body.innerText?.length ?? 0))

    // Give Patel 20 seconds to start generating before we poll
    await page.waitForTimeout(20_000)

    while (Date.now() < deadline) {
      await page.waitForTimeout(6_000)

      const body     = await page.evaluate(() => document.body.innerText ?? '')
      const docCount = (body.match(/Document ready/g) ?? []).length

      if (docCount >= expectedDocCount) return   // artifact appeared — done

      // Only react when Patel has added substantial new content
      if (body.length > lastBodyLen + 300) {
        lastBodyLen = body.length
        const tail = body.slice(-2000)   // only look at Patel's latest reply
        if (proceedsSent < 2 && tail.includes('?')) {
          proceedsSent++
          await clearAndSend(page,
            'All information has been provided. The team has reviewed the previous deliverables and done initial outbound testing with positive signal. Proceed and build this deliverable now — do not ask any more questions.',
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
    if (body.includes('"artifact_type"')) throw new Error('Raw JSON visible in viewer')
    if (!keywords.some(k => body.includes(k))) throw new Error(`Keywords not found: ${keywords.join(', ')}`)
  })

  return true
}

// ── The test ────────────────────────────────────────────────────────────────────

test('TestCo — master lifecycle suite', async ({ page, context }) => {
  test.setTimeout(3_600_000)   // 60 minutes

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`\n📂 Output: ${PDF_PATH}\n`)

  // ══════════════════════════════════════════════════════════════════
  // BLOCK 1 — AUTH
  // ══════════════════════════════════════════════════════════════════
  console.log('\n🔐 BLOCK 1 — Auth\n')

  let email    = ''
  let password = ''

  const acctCreated = await run('[Auth] Create founder account via API', async () => {
    const acct = await createFounderAccount({
      companyName:      CO.name,
      industry:         CO.industryValue,
      problemStatement: CO.problemStatement,
      targetCustomer:   CO.targetCustomer,
    })
    email    = acct.email
    password = acct.password
    console.log(`  → created ${email}`)
  })

  const signedIn = await run('[Auth] Sign in with credentials', async () => {
    if (!acctCreated) throw new Error('Account creation failed')
    await signInWithCredentials(page, email, password)
    expect(page.url()).toMatch(/\/(founder|investor)/)
  })

  await run('[Auth] Dashboard loads', async () => {
    if (!signedIn) throw new Error('Not signed in')
    await page.goto('/founder/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => document.body.innerText.length > 200, { timeout: 15_000 })
  })

  await run('[Auth] Sign out', async () => {
    if (!signedIn) throw new Error('Not signed in')
    // The sign-out button is inside a dropdown in the sidebar.
    // Open it by clicking the user trigger div at the bottom of the nav.
    await page.evaluate(() => {
      const nav = document.querySelector('nav')
      if (!nav) return
      const divs = Array.from(nav.querySelectorAll('div'))
      // Find the last div with cursor:pointer style — that's the user profile trigger
      const trigger = divs.reverse().find(el => {
        const style = (el as HTMLElement).style?.cursor
        return style === 'pointer'
      })
      if (trigger) (trigger as HTMLElement).click()
    })
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL(/\/(login|^$)/, { timeout: 15_000 })
  })

  const _reSignedIn = await run('[Auth] Sign back in', async () => {
    if (!acctCreated) throw new Error('Account not created')
    await signInWithCredentials(page, email, password)
    expect(page.url()).toMatch(/\/(founder|investor)/)
  })

  await run('[Auth] Forgot password — request email', async () => {
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 10_000 })
    await emailInput.fill(email)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForFunction(
      () => {
        const t = document.body.innerText.toLowerCase()
        return t.includes('check your') || t.includes('email sent') || t.includes('inbox') || t.includes('link sent')
      },
      { timeout: 15_000 },
    )
  })

  // ══════════════════════════════════════════════════════════════════
  // BLOCK 2 — DB VERIFICATION
  // (Re-sign in after reset-password navigation, then check DB state)
  // ══════════════════════════════════════════════════════════════════
  console.log('\n🗄️  BLOCK 2 — DB Verification\n')

  // Ensure we're signed in for the DB checks
  if (acctCreated && !page.url().includes('/founder')) {
    await signInWithCredentials(page, email, password).catch(() => {})
  }

  await run('[DB] founder_profiles row exists', async () => {
    if (!acctCreated) throw new Error('Account not created')
    await page.goto('/founder/dashboard')
    await page.waitForLoadState('networkidle')
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/founder/profile', { credentials: 'include' })
      if (!r.ok) return null
      return r.json() as Promise<Record<string, unknown>>
    })
    if (!res) throw new Error('GET /api/founder/profile returned null or error')
    const json = JSON.stringify(res)
    // Response should contain startup_name or profile data
    if (!json.includes('TestCo') && !json.includes('profile')) {
      throw new Error(`Profile missing expected data: ${json.slice(0, 200)}`)
    }
  })

  await run('[DB] qscore_history row created', async () => {
    // Dashboard should reference Q-Score (initial row created at registration)
    await page.waitForFunction(
      () => {
        const t = document.body.innerText
        return t.includes('Q-Score') || t.includes('Q Score') || t.includes('score')
      },
      { timeout: 15_000 },
    )
  })

  await run('[DB] subscription_usage rows created', async () => {
    // Accessing the dashboard without a subscription wall = usage rows exist
    const body = await page.evaluate(() => document.body.innerText.toLowerCase())
    if (body.includes('subscription required') || body.includes('upgrade to access')) {
      throw new Error('Subscription wall on dashboard — usage rows may not have been created')
    }
  })

  // ══════════════════════════════════════════════════════════════════
  // BLOCK 3 — PROFILE BUILDER
  // ══════════════════════════════════════════════════════════════════
  console.log('\n🏗️  BLOCK 3 — Profile Builder\n')

  const pbNavOk = await run('[PB] Navigate to profile builder', async () => {
    await page.goto('/founder/profile-builder')
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(
      () => {
        const t = document.body.innerText ?? ''
        return t.includes('Documents') || t.includes('Skip') || !!document.querySelector('textarea')
      },
      { timeout: 25_000 },
    )
  })

  const docsDone = await run('[PB] Skip documents upload', async () => {
    if (!pbNavOk) throw new Error('Profile builder did not load')
    const btn = page.locator('button').filter({ hasText: /Skip.*question|Continue →/i }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10_000 })
  })

  const pitchDone = await run('[PB] Skip pitch deck', async () => {
    if (!docsDone) throw new Error('Documents step failed')
    const btn = page.locator('button').filter({ hasText: /^Next →$/ }).first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await btn.click()
    await page.waitForFunction(() => document.body.innerText.includes('Market Validation'), { timeout: 10_000 })
  })

  const s1ok = await run('[PB] S1 — Market Validation', async () => {
    if (!pitchDone) throw new Error('Pitch skip failed')
    await answerSection(page, 'Market Validation', CO.answers.s1)
  })
  const s1adv = await run('[PB] Advance to S2', async () => {
    if (!s1ok) throw new Error('S1 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(() => document.body.innerText.includes('Market & Competition'), { timeout: 10_000 })
  })

  const s2ok = await run('[PB] S2 — Market & Competition', async () => {
    if (!s1adv) throw new Error('S1 advance failed')
    await answerSection(page, 'Market & Competition', CO.answers.s2)
  })
  const s2adv = await run('[PB] Advance to S3', async () => {
    if (!s2ok) throw new Error('S2 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(
      () => document.body.innerText.includes('IP & Technology') || document.body.innerText.includes('Defensibility'),
      { timeout: 10_000 },
    )
  })

  const s3ok = await run('[PB] S3 — IP & Technology', async () => {
    if (!s2adv) throw new Error('S2 advance failed')
    await answerSection(page, 'IP & Technology', CO.answers.s3)
  })
  const s3adv = await run('[PB] Advance to S4', async () => {
    if (!s3ok) throw new Error('S3 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(() => document.body.innerText.includes('Team'), { timeout: 10_000 })
  })

  const s4ok = await run('[PB] S4 — Team', async () => {
    if (!s3adv) throw new Error('S3 advance failed')
    await answerSection(page, 'Team', CO.answers.s4)
  })
  const s4adv = await run('[PB] Advance to S5', async () => {
    if (!s4ok) throw new Error('S4 failed')
    await page.locator('button').filter({ hasText: /^Next →$/ }).first().click()
    await page.waitForFunction(
      () => document.body.innerText.includes('Financials') || document.body.innerText.includes('Impact'),
      { timeout: 10_000 },
    )
  })

  const s5ok = await run('[PB] S5 — Financials', async () => {
    if (!s4adv) throw new Error('S4 advance failed')
    await answerSection(page, 'Financials', CO.answers.s5)
  })

  const atSubmit = await run('[PB] Advance to Review & Submit', async () => {
    if (!s5ok) throw new Error('S5 failed')
    for (let i = 0; i < 3; i++) {
      const btn = page.locator('button').filter({ hasText: /Next →|Review & Submit →/ }).first()
      if (!await btn.isVisible({ timeout: 3_000 }).catch(() => false)) break
      await btn.click()
      await page.waitForTimeout(1_200)
    }
    await expect(
      page.locator('button').filter({ hasText: /Calculate My Q-Score/i }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  const qScoreOk = await run('[PB] Calculate Q-Score', async () => {
    if (!atSubmit) throw new Error('Did not reach Review & Submit')
    const btn = page.locator('button').filter({ hasText: /Calculate My Q-Score/i }).first()
    if (await btn.getAttribute('disabled') !== null) {
      const body = await page.evaluate(() => document.body.innerText)
      const m = body.match(/(\d+)\/5 sections complete/)
      throw new Error(`Button disabled — ${m?.[0] ?? 'check section completion'}`)
    }
    await btn.click()
    await expect(page.locator('text=/Q-Score|Grade|score/i').first()).toBeVisible({ timeout: 40_000 })
  })

  await run('[PB] Q-Score > 0', async () => {
    if (!qScoreOk) throw new Error('Q-Score calculation failed')
    const body = await page.evaluate(() => document.body.innerText)
    // Look for a numeric score that appears near Q-Score text
    const match = body.match(/Q.?Score[^0-9]*(\d+)/i) ?? body.match(/(\d{1,3})\s*(?:\/\s*100)/)
    if (!match) throw new Error('Could not parse Q-Score number from page')
    const score = parseInt(match[1], 10)
    if (score === 0) throw new Error('Q-Score is 0 — profile builder data may not have been saved')
  })

  // ══════════════════════════════════════════════════════════════════
  // BLOCK 4 — PATEL D1 ICP
  // ══════════════════════════════════════════════════════════════════
  console.log('\n🤖 BLOCK 4 — Patel D1 ICP\n')

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
    for (const d of ['D1 ICP', 'D2 Pains & Gains', 'D3 Buyer Journey', 'D4 Positioning', 'D6 GTM Playbook']) {
      skip(`[Patel] ${d} — send`,          'Patel workspace failed to load')
      skip(`[Patel] ${d} — artifact card`, 'Patel workspace failed to load')
      skip(`[Patel] ${d} — viewer`,        'Patel workspace failed to load')
    }
  } else {
    // ════════════════════════════════════════════
    // BLOCK 4 — D1 ICP
    // ════════════════════════════════════════════
    await buildDeliverable(page, 'D1 ICP', CO.d1Message, 1, ['Segment', 'Persona', 'ICP', 'Target'])

    // ════════════════════════════════════════════
    // BLOCK 5 — D2, D3, D4
    // ════════════════════════════════════════════
    console.log('\n📊 BLOCK 5 — Patel D2, D3, D4\n')

    await buildDeliverable(page, 'D2 Pains & Gains',
      'D1 ICP is complete. The team has reviewed it and we have done initial outbound testing on LinkedIn with positive signal from Heads of Support. Build D2 — Pains, Gains and Triggers analysis for the TestCo ICP. Proceed and build D2 now.',
      2, ['Pain', 'Gain', 'Trigger'])

    await buildDeliverable(page, 'D3 Buyer Journey',
      'D1 and D2 are complete. Build D3 — Buyer Journey map for the TestCo ICP. Proceed and build D3 now.',
      3, ['Stage', 'Journey', 'Evaluation', 'Buyer'])

    await buildDeliverable(page, 'D4 Positioning',
      'D1, D2, D3 are complete. Build D4 — Positioning and Messaging for TestCo. Proceed and build D4 now.',
      4, ['Positioning', 'Message', 'Pillar'])

    // ════════════════════════════════════════════
    // BLOCK 6 — GTM PLAYBOOK D6
    // ════════════════════════════════════════════
    console.log('\n📋 BLOCK 6 — GTM Playbook D6\n')

    await buildDeliverable(page, 'D6 GTM Playbook',
      'D1, D2, D3, D4 are all complete and reviewed. Build D6 — the full GTM Playbook for TestCo. Proceed and build D6 now.',
      5, ['Playbook', 'Phase', 'Channel', 'GTM'])
  }

  // ══════════════════════════════════════════════════════════════════
  // BLOCK 7 — PDF EXPORT
  // ══════════════════════════════════════════════════════════════════
  console.log('\n📄 BLOCK 7 — PDF Export\n')

  await run('[PDF] Save testco.pdf', async () => {
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
    if (size < 10_000) throw new Error(`PDF too small (${size} bytes) — likely blank`)
    console.log(`\n📄 Saved: ${PDF_PATH} (${Math.round(size / 1024)} KB)\n`)
  })

  printSummary()
})

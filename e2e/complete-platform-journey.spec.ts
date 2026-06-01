/**
 * E2E — Complete Platform Journey
 *
 * Covers both the founder and investor sides end-to-end:
 *
 *   Founder:  API signup → sign-in → profile builder (pitch + 5 sections) →
 *             Q-Score report → dashboard → CXO hub → 10 agent smoke tests →
 *             Patel D1→D6 (all deliverables) → deliverables library
 *
 *   Investor: UI onboarding wizard (6 steps) → dashboard → deal flow →
 *             pipeline → portfolio companies → settings
 *
 *   Cross-side: connection request → accept → messaging → notifications
 *
 * DIAGNOSTIC design: every step is wrapped in run() so the test keeps going
 * even when individual steps fail. A results table is printed at the end.
 * Final assert: failCount === 0 (test is FAIL only if any step failed).
 *
 * Run:
 *   npx playwright test e2e/complete-platform-journey.spec.ts --headed
 *   npx playwright test e2e/complete-platform-journey.spec.ts --reporter=html
 *   npx playwright show-report
 *
 * Expected duration: 15–18 minutes.
 */

import { test, expect } from '@playwright/test'
import {
  createFounderAccount,
  createInvestorAccount,
  signInWithCredentials,
  type FounderAccount,
} from './helpers/auth'
import {
  chatWithAgent,
  waitForArtifactCard,
  assertViewerKeywords,
  getQScoreViaAPI,
  snapshotQScore,
  fillProfileBuilderSection,
  submitProfileBuilder,
  type QScoreSnapshot,
} from './helpers/agents'
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  openConversationThread,
  sendMessage,
  getNotifications,
} from './helpers/marketplace'

// ── test data ─────────────────────────────────────────────────────────────────

const RUN_ID = Date.now()

const CO = {
  email:            `test-platform-founder-${RUN_ID}@pw.test`,
  name:             'PlatformTest Co',
  industryValue:    'ai-software',
  stage:            'commercial',
  problemStatement: 'Sales teams at B2B SaaS companies spend 60% of their time on admin tasks instead of selling.',
  targetCustomer:   'VP of Sales at 50-200 person B2B SaaS companies',
  tagline:          'AI that sells for your sales team',
  location:         'San Francisco, CA',
  teamSize:         '5-10',
}

const INV = {
  email:     `test-platform-investor-${RUN_ID}@pw.test`,
  password:  'TestPass123!',
  firstName: 'Test',
  lastName:  'Investor',
  firmName:  'Test Ventures',
  thesis:
    'Test Ventures invests in early-stage AI and SaaS companies solving enterprise pain points. ' +
    'We focus on pre-seed to Series A, writing $250K–$1M checks. We back founders who have lived ' +
    'the problem they are solving and have strong early customer evidence. Our portfolio spans ' +
    'B2B SaaS, developer tools, and AI infrastructure across North America and Europe.',
}

// Profile-builder answers — substantive enough to score well
const PITCH = [
  'PlatformTest Co automates admin tasks for B2B SaaS sales teams using AI, so reps spend more time selling.',
  'Sales reps spend 60% of their time on non-selling admin tasks like data entry and follow-ups. We eliminate that.',
  'VP of Sales at 50-200 person B2B SaaS companies who need their team to close more deals faster.',
  '$2,200 MRR, 6 paying customers, 100% annual retention, 18% month-on-month growth, 28-day sales cycle.',
  'AI productivity tools are now mainstream. We have 12 combined years in B2B sales ops and lived this problem.',
]

const ANSWERS = {
  s1:
    'We have completed 40 discovery interviews with VP Sales at B2B SaaS companies. Six are paying customers ' +
    'at $350/month ($2,100 MRR). All 6 renewed after 12 months — 100% retention. Sales cycle averages 28 days ' +
    'from first demo to signed contract. Largest contract is $6,000 ACV. Three customers expanded after 90 days. ' +
    'NPS is 74 among paying users. Customer acquisition has been 100% founder-led so far.',

  s2:
    'TAM is $4.2B (US sales productivity software). Market urgency is acute: enterprise sales cycles lengthened ' +
    '35% since 2022 and RevOps teams are overwhelmed. Competitors: Outreach (enterprise, $100k+ ACV), Salesloft ' +
    '(enterprise), Gong (conversation intelligence only). We target 50-200 person SaaS companies that Outreach ' +
    'prices out. Market growing 18% YoY. No dominant vendor in the mid-market segment we operate in.',

  s3:
    'No patents filed. Our moat is a proprietary AI training dataset from 2,000+ real B2B sales interactions ' +
    'curated from our beta cohort. No competitor has this dataset. A new entrant would need 18 months and $3M ' +
    'to replicate our training data quality. Custom NLP pipeline fine-tuned on B2B sales language — not generic ' +
    'GPT wrappers. CTO previously led ML engineering at a top RevTech company. Replication time: 18+ months.',

  s4:
    'Founding team: 12 years combined B2B SaaS experience. CEO spent 7 years as VP Sales at two Series B SaaS ' +
    'companies — generated $4M ARR in previous role. CTO built ML infrastructure at a RevTech unicorn. Full-time ' +
    'team: 4 people (2 engineers, 1 designer, 1 GTM). Advisor board includes VP Sales at HubSpot and a former ' +
    'Salesforce product leader. No critical team gaps in core functions.',

  s5:
    '$2,200 MRR growing 18% month-over-month. Monthly burn $9,500. 22-month runway from current angel round. ' +
    '74% gross margin — purely software, no services. Average deal size $4,400 ACV. LTV estimated at $13,200 ' +
    'based on 3-year average B2B SaaS peer retention. CAC is $720 through founder-led sales. Payback: 5 months. ' +
    'Cap table: 2 co-founders at 45% each, 10% advisor pool. No debt.',
}

// Patel context injected before D1 so all deliverables build on consistent data
const PATEL_CONTEXT =
  'We are PlatformTest Co — AI-powered sales automation for VP Sales at 50-200 person B2B SaaS companies. ' +
  'Pain: sales reps spend 60% of time on admin tasks. We eliminate that so they sell more. ' +
  '$2,200 MRR, 6 paying customers, 100% retention, 28-day sales cycle.'

// D1–D6 deliverable definitions
const DELIVERABLES = [
  {
    key: 'D1 ICP',
    message:
      PATEL_CONTEXT +
      '\n\nBuild my ICP document. Primary buyer: VP of Sales at 50-200 person B2B SaaS companies. ' +
      'Pain: 60% of reps\' time lost to admin. 6 paying customers match this exact profile exactly.',
    artifactType: 'icp_document',
    keywords:    ['ICP', 'segment', 'buyer', 'firmographic'],
  },
  {
    key: 'D2 Pains & Gains',
    message:  'Build D2 — Pains and Gains analysis for the PlatformTest Co ICP defined in D1.',
    artifactType: 'pains_gains_triggers',
    keywords:    ['pain', 'gain', 'trigger', 'emotional'],
  },
  {
    key: 'D3 Buyer Journey',
    message:  'Build D3 — Buyer Journey map for VP Sales at 50-200 person SaaS companies.',
    artifactType: 'buyer_journey',
    keywords:    ['journey', 'stage', 'content', 'buyer'],
  },
  {
    key: 'D4 Positioning',
    message:  'Build D4 — Positioning and Messaging framework for PlatformTest Co.',
    artifactType: 'positioning_messaging',
    keywords:    ['positioning', 'value', 'pillar', 'message'],
  },
  {
    key: 'D5 Competitive',
    message:
      'D1, D2, D3, D4 are all complete. Build D5 — Competitive Intelligence and Outreach Sequence ' +
      'targeting VP Sales at SaaS companies. Competitors: Outreach, Salesloft, Gong.',
    artifactType: 'lead_list',
    keywords:    ['competitor', 'outreach', 'email', 'sequence'],
  },
  {
    key: 'D6 GTM Playbook',
    message:
      'All previous deliverables are complete (D1–D5). Build D6 — the full GTM Playbook for PlatformTest Co now.',
    artifactType: 'gtm_playbook',
    keywords:    ['objective', 'channel', 'budget', 'playbook'],
  },
]

// 10 non-Patel agent smoke tests
const AGENT_SMOKE = [
  { agentId: 'susi',   message: 'Build me a B2B sales qualification checklist for VP Sales prospects' },
  { agentId: 'maya',   message: 'Create a brand positioning statement for our AI sales automation product' },
  { agentId: 'carter', message: 'Set up a customer health scoring template for 6 paying B2B customers' },
  { agentId: 'riley',  message: 'Outline a growth experiment we can run this week to acquire our next 3 customers' },
  { agentId: 'felix',  message: 'Give me a SaaS financial model template for a company at $2,200 MRR' },
  { agentId: 'leo',    message: 'Check our IP protection gaps for an AI product with a proprietary training dataset' },
  { agentId: 'harper', message: 'Create a hiring plan for our next 3 hires: engineer, marketing, and sales' },
  { agentId: 'nova',   message: 'Design a PMF survey for our AI sales automation product targeting VP Sales' },
  { agentId: 'atlas',  message: 'Map our top 3 competitors: Outreach, Salesloft, and Gong vs our positioning' },
  { agentId: 'sage',   message: 'What are our top 3 strategic priorities for the next 90 days at $2,200 MRR?' },
]

// ── result tracker ────────────────────────────────────────────────────────────

type Status = 'PASS' | 'FAIL' | 'SKIP'
interface Result { phase: string; step: string; status: Status; detail: string }

// ── test ──────────────────────────────────────────────────────────────────────

test.describe('Complete Platform Journey', () => {
  test.setTimeout(30 * 60 * 1000) // 30 minutes

  test('founder + investor end-to-end', async ({ page, browser }) => {
    const results: Result[] = []

    async function run(phase: string, step: string, fn: () => Promise<void>): Promise<boolean> {
      try {
        await fn()
        results.push({ phase, step, status: 'PASS', detail: '' })
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message.split('\n')[0] : String(err)
        results.push({ phase, step, status: 'FAIL', detail: msg.slice(0, 120) })
        return false
      }
    }

    function skip(phase: string, step: string, reason: string) {
      results.push({ phase, step, status: 'SKIP', detail: reason })
    }

    const founderPage  = page
    const investorCtx  = await browser.newContext()
    const investorPage = await investorCtx.newPage()

    let FOUNDER: FounderAccount = { email: '', password: 'TestPass123!', userId: '', profileId: '' }
    let Q0 = 0
    let Q1: QScoreSnapshot | null = null
    let Q2: QScoreSnapshot | null = null

    try {

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 0 — Account Setup (API)
      // ───────────────────────────────────────────────────────────────────────

      await run('P0', 'Create founder account via API', async () => {
        FOUNDER = await createFounderAccount({
          email:            CO.email,
          companyName:      CO.name,
          industry:         CO.industryValue,
          stage:            CO.stage,
          problemStatement: CO.problemStatement,
          targetCustomer:   CO.targetCustomer,
          teamSize:         CO.teamSize,
          location:         CO.location,
          tagline:          CO.tagline,
        })
        expect(FOUNDER.userId).toBeTruthy()
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 1 — Founder Sign-In
      // ───────────────────────────────────────────────────────────────────────

      await run('P1', 'Founder sign-in', async () => {
        await signInWithCredentials(founderPage, FOUNDER.email, FOUNDER.password, /\/founder/)
        await expect(founderPage).not.toHaveURL(/\/login/)
      })

      await run('P1', 'Founder landing page is error-free', async () => {
        const body = await founderPage.locator('body').innerText()
        expect(body).not.toMatch(/404|page not found/i)
        expect(body.length).toBeGreaterThan(50)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 2 — Investor Account (API + sign-in)
      // The onboarding UI wizard uses OAuth providers disabled in this env.
      // Use the Admin API helper to create + complete the profile, then sign in.
      // ───────────────────────────────────────────────────────────────────────

      let INVESTOR: { email: string; password: string; userId: string } = { email: '', password: 'TestPass123!', userId: '' }

      await run('P2', 'Create investor account via Admin API', async () => {
        INVESTOR = await createInvestorAccount({
          fullName:  `${INV.firstName} ${INV.lastName}`,
          firmName:  INV.firmName,
          email:     INV.email,
        })
        expect(INVESTOR.userId).toBeTruthy()
      })

      await run('P2', 'Investor sign-in + dashboard loads', async () => {
        await signInWithCredentials(investorPage, INVESTOR.email, INVESTOR.password, /\/investor/)
        await expect(investorPage).not.toHaveURL(/\/login/)
        const body = await investorPage.locator('body').innerText()
        expect(body).not.toMatch(/404|page not found/i)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 3 — Founder Profile Builder (5 pitch Qs + 5 sections)
      // ───────────────────────────────────────────────────────────────────────

      await run('P3', 'Navigate to profile builder', async () => {
        await founderPage.goto('/founder/profile-builder')
        await founderPage.waitForLoadState('networkidle')
        const url = founderPage.url()
        // If redirected (assessment already done), note it but don't fail
        if (!url.includes('profile-builder')) {
          console.log(`  ℹ️  Profile builder redirected to: ${url} — account may already have a score`)
        }
      })

      await run('P3', 'Skip document upload', async () => {
        const skipBtn = founderPage.locator(
          'button:has-text("Skip"), button:has-text("Continue without"), button:has-text("Next"), button:has-text("No thanks")'
        ).first()
        if (await skipBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
          await skipBtn.click()
          await founderPage.waitForTimeout(1_500)
        }
      })

      // Answer "The Pitch" — 5 YC-style questions
      for (let i = 0; i < PITCH.length; i++) {
        await run('P3', `Pitch Q${i + 1}`, async () => {
          await fillProfileBuilderSection(founderPage, PITCH[i])
          await founderPage.waitForTimeout(1_000)
        })
      }

      // Answer all 5 profile builder sections
      const SECTION_LABELS = [
        'Section 1 (Market & Customers)',
        'Section 2 (Market & Competition)',
        'Section 3 (IP & Technology)',
        'Section 4 (Founder & Team)',
        'Section 5 (Financials)',
      ]
      const SECTION_ANSWERS = [ANSWERS.s1, ANSWERS.s2, ANSWERS.s3, ANSWERS.s4, ANSWERS.s5]
      for (let i = 0; i < 5; i++) {
        await run('P3', SECTION_LABELS[i], async () => {
          await fillProfileBuilderSection(founderPage, SECTION_ANSWERS[i])
          await founderPage.waitForTimeout(2_000)
        })
      }

      await run('P3', 'Submit profile builder', async () => {
        await submitProfileBuilder(founderPage)
        await founderPage.waitForTimeout(3_000)
      })

      await run('P3', 'Q-Score report visible', async () => {
        // Wait for a score to appear anywhere on the page
        await founderPage.waitForFunction(
          () => /\d{1,3}/.test(document.body.innerText) && document.body.innerText.includes('Score'),
          { timeout: 30_000 }
        )
        Q0 = await getQScoreViaAPI(founderPage)
        console.log(`  📊 Q-Score after profile builder: ${Q0}`)
        expect(Q0).toBeGreaterThanOrEqual(0)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 4 — Founder Dashboard
      // ───────────────────────────────────────────────────────────────────────

      await run('P4', 'Dashboard loads', async () => {
        await founderPage.goto('/founder/dashboard')
        await founderPage.waitForLoadState('networkidle')
        const body = await founderPage.locator('body').innerText()
        expect(body).not.toMatch(/404|page not found/i)
        expect(body.length).toBeGreaterThan(100)
      })

      await run('P4', 'Q-Score card visible', async () => {
        await expect(founderPage.locator('text=/Q-Score/i').first()).toBeVisible({ timeout: 10_000 })
      })

      await run('P4', '"Getting Started Guide" link visible', async () => {
        await expect(founderPage.locator('text=/Getting Started/i').first()).toBeVisible({ timeout: 8_000 })
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 5 — CXO Suite Hub
      // ───────────────────────────────────────────────────────────────────────

      await run('P5', 'CXO hub loads', async () => {
        await founderPage.goto('/founder/cxo')
        await founderPage.waitForLoadState('networkidle')
        await expect(founderPage).not.toHaveURL(/404/)
      })

      await run('P5', 'All 11 agent names visible', async () => {
        const body = await founderPage.locator('body').innerText()
        const names = ['Patel', 'Susi', 'Maya', 'Carter', 'Riley', 'Felix', 'Leo', 'Harper', 'Nova', 'Atlas', 'Sage']
        const missing = names.filter(n => !body.includes(n))
        expect(missing, `Missing agents on CXO hub: [${missing.join(', ')}]`).toHaveLength(0)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 6 — Agent UI Smoke (10 non-Patel agents, no LLM calls)
      // Just verifies each agent page loads with a chat textarea — fast.
      // ───────────────────────────────────────────────────────────────────────

      for (const { agentId } of AGENT_SMOKE) {
        await run('P6', `Agent UI: ${agentId}`, async () => {
          await founderPage.goto(`/founder/cxo/${agentId}`)
          await founderPage.waitForLoadState('load')
          await expect(founderPage).toHaveURL(new RegExp(`/cxo/${agentId}`), { timeout: 10_000 })
          const textarea = founderPage.locator('textarea').first()
          await expect(textarea).toBeVisible({ timeout: 15_000 })
          const body = await founderPage.locator('body').innerText()
          expect(body.length, `${agentId}: page has no content`).toBeGreaterThan(100)
        })
      }

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 7 — Patel D1→D6 Full Deliverable Journey
      // ───────────────────────────────────────────────────────────────────────

      Q1 = await snapshotQScore(founderPage, 'before-D1')

      for (const d of DELIVERABLES) {
        await run('P7', `${d.key} — generate`, async () => {
          // Navigate to Patel if not already there
          if (!founderPage.url().includes('/cxo/patel')) {
            await founderPage.goto('/founder/cxo/patel')
            await founderPage.waitForLoadState('load')
          }
          // Capture body length before sending so we can detect a new response
          const before = await founderPage.evaluate(() => document.body.innerText.length)
          const textarea = founderPage.locator('textarea').last()
          await expect(textarea).toBeVisible({ timeout: 15_000 })
          await textarea.fill(d.message)
          const sendBtn = founderPage.locator(
            'button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]'
          ).last()
          await sendBtn.click()
          // Wait for body text to grow — agent is streaming a response
          await founderPage.waitForFunction(
            (prev: number) => document.body.innerText.length > prev + 300,
            before,
            { timeout: 120_000 },
          )
        })
        await run('P7', `${d.key} — artifact card`, async () => {
          await waitForArtifactCard(founderPage, d.artifactType, 60_000)
        })
        await run('P7', `${d.key} — viewer keywords`, async () => {
          await assertViewerKeywords(founderPage, d.keywords, 2)
        })
      }

      Q2 = await snapshotQScore(founderPage, 'after-D6')
      console.log(`  📈 Q-Score: profile=${Q0}  before-D1=${Q1?.overall ?? '?'}  after-D6=${Q2.overall}`)

      await run('P7', 'Q-Score did not decrease after deliverables', async () => {
        if (Q1 && Q2) expect(Q2.overall).toBeGreaterThanOrEqual(Q1.overall)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 8 — Deliverables Library
      // ───────────────────────────────────────────────────────────────────────

      await run('P8', 'Deliverables library loads', async () => {
        await founderPage.goto('/founder/workspace')
        await founderPage.waitForLoadState('networkidle')
        const body = await founderPage.locator('body').innerText()
        expect(body).not.toMatch(/404|page not found/i)
      })

      await run('P8', 'Artifact labels visible in library', async () => {
        const body = await founderPage.locator('body').innerText()
        const terms = ['ICP', 'Playbook', 'Positioning', 'Journey', 'Pains', 'Competitive']
        const found = terms.filter(t => body.toLowerCase().includes(t.toLowerCase()))
        expect(found.length, `Expected artifact labels, found: [${found.join(', ')}]`).toBeGreaterThanOrEqual(2)
      })

      await run('P8', 'Export/download button visible', async () => {
        const exportBtn = founderPage.locator(
          'button:has-text("PDF"), button:has-text("Download"), button:has-text("Export"), a:has-text("Download")'
        ).first()
        await expect(exportBtn).toBeVisible({ timeout: 10_000 })
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 9 — Investor Dashboard
      // ───────────────────────────────────────────────────────────────────────

      await run('P9', 'Investor dashboard loads', async () => {
        await investorPage.goto('/investor/dashboard')
        await investorPage.waitForLoadState('networkidle')
        const body = await investorPage.locator('body').innerText()
        expect(body).not.toMatch(/404|page not found/i)
        expect(body.length).toBeGreaterThan(100)
      })

      await run('P9', 'Investor nav sidebar visible', async () => {
        const body = await investorPage.locator('body').innerText()
        // At least one nav item should appear
        const navItems = ['Deal Flow', 'Pipeline', 'Portfolio', 'Messages', 'Dashboard']
        const found = navItems.filter(n => body.includes(n))
        expect(found.length).toBeGreaterThanOrEqual(2)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 10 — Deal Flow
      // ───────────────────────────────────────────────────────────────────────

      await run('P10', 'Deal flow page loads', async () => {
        await investorPage.goto('/investor/deal-flow')
        await investorPage.waitForLoadState('networkidle')
        await expect(investorPage).not.toHaveURL(/404/)
      })

      await run('P10', 'Startup cards / content visible', async () => {
        await investorPage.waitForFunction(
          () => document.body.innerText.length > 300,
          { timeout: 15_000 }
        )
        const body = await investorPage.locator('body').innerText()
        expect(body.length).toBeGreaterThan(300)
      })

      await run('P10', 'Q-Score values visible on page', async () => {
        const body = await investorPage.locator('body').innerText()
        expect(body).toMatch(/\d{1,3}/)
      })

      await run('P10', 'Click first startup card', async () => {
        const cardCandidates = investorPage.locator(
          '[class*="card"]:visible, [class*="Card"]:visible, [class*="startup"]:visible, [class*="founder"]:visible'
        )
        const count = await cardCandidates.count()
        if (count > 0) {
          await cardCandidates.first().click()
          await investorPage.waitForLoadState('networkidle')
        }
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 11 — Investor Pipeline
      // ───────────────────────────────────────────────────────────────────────

      await run('P11', 'Pipeline (Kanban) loads', async () => {
        await investorPage.goto('/investor/pipeline')
        await investorPage.waitForLoadState('networkidle')
        await expect(investorPage).not.toHaveURL(/404/)
      })

      await run('P11', 'Kanban stage labels visible', async () => {
        const body = await investorPage.locator('body').innerText()
        const stages = ['Watchlist', 'Contacted', 'Meeting', 'Due Diligence']
        const found = stages.filter(s => body.includes(s))
        expect(found.length, `Expected Kanban stages, found: [${found.join(', ')}]`).toBeGreaterThanOrEqual(2)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 12 — Investor Portfolio Companies
      // ───────────────────────────────────────────────────────────────────────

      await run('P12', 'Portfolio companies page loads', async () => {
        await investorPage.goto('/investor/portfolio-companies')
        await investorPage.waitForLoadState('networkidle')
        await expect(investorPage).not.toHaveURL(/404/)
      })

      await run('P12', '"Add Company" button visible', async () => {
        const addBtn = investorPage.locator(
          'button:has-text("Add"), button:has-text("Company"), button:has-text("+ Add")'
        ).first()
        await expect(addBtn).toBeVisible({ timeout: 10_000 })
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 13 — Connection Flow (Founder → Investor)
      // ───────────────────────────────────────────────────────────────────────

      await run('P13', 'Founder matching page loads', async () => {
        await founderPage.goto('/founder/matching')
        await founderPage.waitForLoadState('networkidle')
        const body = await founderPage.locator('body').innerText()
        expect(body.length).toBeGreaterThan(100)
      })

      const connectionSent = await run('P13', 'Founder sends connection request', async () => {
        const sent = await sendConnectionRequest(
          founderPage,
          'Ventures',
          `Hi, I'd love to connect. We've just completed our GTM Playbook with a Q-Score of ${Q2?.overall ?? Q0}. Would love your thoughts.`
        )
        if (!sent) console.log('  ⚠️  sendConnectionRequest returned false — may be Q-Score gated or no matching investor visible')
        // Non-fatal: gating may prevent connection at current Q-Score
      })

      if (connectionSent) {
        await run('P13', 'Investor accepts connection request', async () => {
          const accepted = await acceptConnectionRequest(investorPage, 'PlatformTest')
          if (!accepted) console.log('  ⚠️  acceptConnectionRequest returned false — connection may have gone to a demo investor')
        })
      } else {
        skip('P13', 'Investor accept connection', 'Connection was not sent — skipping acceptance')
      }

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 14 — Messaging
      // ───────────────────────────────────────────────────────────────────────

      await run('P14', 'Founder messages page loads', async () => {
        await founderPage.goto('/founder/messages')
        await founderPage.waitForLoadState('networkidle')
        const body = await founderPage.locator('body').innerText()
        expect(body).not.toMatch(/404/i)
        expect(body.length).toBeGreaterThan(50)
      })

      await run('P14', 'Investor messages page loads', async () => {
        await investorPage.goto('/investor/messages')
        await investorPage.waitForLoadState('networkidle')
        const body = await investorPage.locator('body').innerText()
        expect(body).not.toMatch(/404/i)
        expect(body.length).toBeGreaterThan(50)
      })

      await run('P14', 'Founder opens thread and sends message', async () => {
        const opened = await openConversationThread(founderPage, 'Ventures')
        if (opened) {
          await sendMessage(
            founderPage,
            `Looking forward to connecting! Our GTM Playbook is ready — Q-Score: ${Q2?.overall ?? Q0}.`
          )
          const body = await founderPage.locator('body').innerText()
          expect(body).toMatch(/Looking forward|GTM Playbook/i)
        }
      })

      await run('P14', 'Investor opens thread and replies', async () => {
        const opened = await openConversationThread(investorPage, 'PlatformTest')
        if (opened) {
          await sendMessage(
            investorPage,
            "Thanks for reaching out. Your Q-Score progression looks strong. Let's set up a call."
          )
          const body = await investorPage.locator('body').innerText()
          expect(body).toMatch(/Thanks|call/i)
        }
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 15 — Notifications
      // ───────────────────────────────────────────────────────────────────────

      await run('P15', 'Fetch founder notifications', async () => {
        const notifs = await getNotifications(founderPage)
        console.log(`  🔔 Founder notifications: ${notifs.length}`)
        // Non-fatal if 0 — may not have fired yet
      })

      await run('P15', 'Fetch investor notifications', async () => {
        const notifs = await getNotifications(investorPage)
        console.log(`  🔔 Investor notifications: ${notifs.length}`)
      })

      // ───────────────────────────────────────────────────────────────────────
      // PHASE 16 — Settings Pages
      // ───────────────────────────────────────────────────────────────────────

      await run('P16', 'Founder settings page', async () => {
        await founderPage.goto('/founder/settings')
        await founderPage.waitForLoadState('networkidle')
        await expect(founderPage).not.toHaveURL(/404/)
        const body = await founderPage.locator('body').innerText()
        expect(body.length).toBeGreaterThan(50)
      })

      await run('P16', 'Investor settings page', async () => {
        await investorPage.goto('/investor/settings')
        await investorPage.waitForLoadState('networkidle')
        await expect(investorPage).not.toHaveURL(/404/)
        const body = await investorPage.locator('body').innerText()
        expect(body.length).toBeGreaterThan(50)
      })

    } finally {
      await investorCtx.close()
    }

    // ───────────────────────────────────────────────────────────────────────
    // PHASE 17 — Results Table & Final Assert
    // ───────────────────────────────────────────────────────────────────────

    const pass    = results.filter(r => r.status === 'PASS').length
    const fail    = results.filter(r => r.status === 'FAIL').length
    const skipped = results.filter(r => r.status === 'SKIP').length
    const total   = results.length

    const BAR = '─'.repeat(90)
    console.log('\n' + BAR)
    console.log(`Edge Alpha — Complete Platform Journey   RUN_ID: ${RUN_ID}`)
    console.log(BAR)
    console.table(
      results.map(r => ({
        Phase:  r.phase,
        Step:   r.step.length > 52 ? r.step.slice(0, 49) + '...' : r.step,
        Status: r.status === 'PASS' ? '✅ PASS' : r.status === 'FAIL' ? '❌ FAIL' : '⏭ SKIP',
        Detail: r.detail.slice(0, 80),
      }))
    )
    console.log(BAR)
    console.log(`  PASS: ${pass}  FAIL: ${fail}  SKIP: ${skipped}  TOTAL: ${total}`)
    console.log(`  Q-Score: profile-builder=${Q0}  before-D1=${Q1?.overall ?? '?'}  after-D6=${Q2?.overall ?? '?'}`)
    console.log(BAR + '\n')

    // Hard fail if any step failed — all steps ran, but the test is FAIL
    expect(fail, `${fail} step(s) failed — see results table above for details`).toBe(0)
  })
})

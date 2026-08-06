import { test, expect } from '@playwright/test'
import { createFounderAccountDirect, signInWithCredentials, makeAuthenticatedRequest } from '../helpers/auth'

/**
 * Live proof: a genuinely NEW company, not the real account reused by every other spec this
 * session — real Q-Score methodology (Profile Builder), then the real CEO mandate flow, real
 * activation. Every step drives the actual engine: real document extraction, real
 * calculateQScore(), real S001/S002 Claude calls, real confirm -> real rhythm trigger.
 *
 * Account creation goes around the local Supabase Auth admin-API bug (see
 * createFounderAccountDirect's own docstring) rather than through the app's real signup FORM —
 * everything AFTER account existence is exercised for real, in the browser, which is where the
 * actual product logic being tested lives.
 *
 * The seeded company is deliberately left in place afterward — the whole point is real,
 * inspectable proof; credentials are printed at the end so it can be logged into directly.
 */

test.describe.configure({ mode: 'serial' })

const COMPANY_NAME = 'Aurora Metrics'

const PITCH_TEXT = `
Aurora Metrics — Real-time unit economics for early-stage SaaS

The problem: early-stage SaaS founders make pricing and hiring decisions on unit economics that
are weeks stale, because CAC and LTV live in three disconnected tools (Stripe, the CRM, and a
hand-built spreadsheet) that nobody reconciles until the board deck is due.

The product: Aurora Metrics connects directly to Stripe and the founder's CRM and computes a
live, always-current CAC, LTV, and gross margin dashboard, updated hourly, with automatic alerts
when unit economics cross a danger threshold (e.g. CAC payback exceeding 18 months).

Traction: we have 14 paying customers at an average of $340/month, for $4,760 in current MRR,
growing roughly 22% month over month for the last four months. Our first ten customers came from
direct outbound to seed-stage YC founders; the last four converted from an inbound waitlist.
Average time from signup to first connected Stripe account is under nine minutes.

Team: two co-founders. Our CEO spent four years as a finance lead at a Series B fintech company,
running the exact monthly unit-economics reconciliation this product automates. Our CTO built
the original data pipeline at a prior startup that was acquired for its billing infrastructure.

Differentiation: every competing tool in this space requires a CSV export and a manual monthly
refresh. Aurora Metrics is the only product that reconciles Stripe and CRM data automatically,
in real time, with no manual export step — that is the entire reason customers switch to us.

Funding: pre-seed, raising a $750K round to extend runway to 18 months and hire one senior
full-stack engineer to build out CRM connectors beyond our current single-CRM integration.
`.trim()

async function dismissWelcomeModalIfPresent(page: import('@playwright/test').Page): Promise<void> {
  const skip = page.getByText('Skip intro')
  if (await skip.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skip.click()
  }
}

let email: string
let password: string

test.beforeAll(async () => {
  const account = await createFounderAccountDirect({ companyName: COMPANY_NAME })
  email = account.email
  password = account.password
  console.log(`\n[fresh-founder-full-journey] seeded account: ${email} / ${password}\n`)
})

test('a fresh company gets a real Q-Score from a real document', async ({ page }) => {
  test.setTimeout(6 * 60_000) // real SSE extraction + real calculateQScore()

  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  await expect(page.getByText('Upload your pitch deck')).toBeVisible({ timeout: 15_000 })

  // The client-side auth session can still be hydrating right after a fresh sign-in redirect —
  // the app itself shows a recoverable "Still signing you in — please wait a moment and try the
  // upload again" banner in that window. Give it a moment, then retry the upload once if needed.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'pitch-summary.txt', mimeType: 'text/plain', buffer: Buffer.from(PITCH_TEXT),
  })
  const stillSigningIn = page.getByText('Still signing you in')
  if (await stillSigningIn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.waitForTimeout(3_000)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'pitch-summary.txt', mimeType: 'text/plain', buffer: Buffer.from(PITCH_TEXT),
    })
  }

  // Real extraction — give it real time.
  const calculateBtn = page.getByRole('button', { name: /Calculate score from documents only|Calculate my Q-Score/i })
  await expect(calculateBtn).toBeVisible({ timeout: 90_000 })
  await calculateBtn.click()

  // Real calculateQScore() — a concrete score/grade must render.
  const qScore = await pollForRealQScore(page, 90_000)
  expect(qScore.overall).toBeGreaterThan(0)
  console.log(`[fresh-founder-full-journey] real Q-Score: ${qScore.overall} (${qScore.grade})`)
})

test('the CEO reads the fresh score, proposes a direction, and the founder confirms a real mandate', async ({ page }) => {
  test.setTimeout(10 * 60_000) // real S001 read + real S002 mandate draft, chained

  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await dismissWelcomeModalIfPresent(page)

  // Step 1 — "the read" auto-starts, no click. Real streamed Claude call.
  console.log('[fresh-founder-full-journey] waiting for the real streamed read + proposed direction…')

  // Step 2 — "Sounds right" appears once the proposal resolves. Grab the real mission text
  // (the curly-quoted <p> ProposedDirection.tsx renders right above the buttons) before clicking.
  const soundsRight = page.getByRole('button', { name: 'Sounds right' })
  await expect(soundsRight).toBeVisible({ timeout: 120_000 })
  const missionText = (await page.locator('p', { hasText: '“' }).first().innerText().catch(() => '')) || 'not captured'
  console.log(`[fresh-founder-full-journey] real proposed direction: ${missionText}`)
  await soundsRight.click()

  // Step 3 — mandate hardens automatically, no click.
  await expect(page.getByText('Hardening into your mandate…')).toBeVisible({ timeout: 15_000 })
  const confirmBtn = page.getByRole('button', { name: 'Confirm mandate' })
  await expect(confirmBtn).toBeVisible({ timeout: 120_000 })

  console.log('[fresh-founder-full-journey] real mandate hardened — confirming…')
  await confirmBtn.click()

  // Step 4 — real Activation trigger. Land on either the Activation screen or the Command View —
  // a genuine timing race, not a bug (ActivationGate.tsx).
  await expect(soundsRight).toHaveCount(0, { timeout: 15_000 }) // Unveiling UI is gone
  await expect(
    page.getByText('Your team is starting on your mandate').or(page.getByText('Your documents')).or(page.getByText(/^Epoch \d/)),
  ).toBeVisible({ timeout: 30_000 })
})

interface QScoreShape { overall: number; grade: string }

/** GET /api/qscore/latest returns { qScore: {...} | null } — poll until a real, non-zero score lands. */
async function pollForRealQScore(page: import('@playwright/test').Page, timeoutMs: number): Promise<QScoreShape> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await makeAuthenticatedRequest(page, '/api/qscore/latest')
    const qScore = (res.data as { qScore: QScoreShape | null } | null)?.qScore
    if (res.status === 200 && qScore && qScore.overall > 0) return qScore
    await page.waitForTimeout(3_000)
  }
  throw new Error('Timed out waiting for a real Q-Score at /api/qscore/latest')
}

/**
 * Agent interaction helpers for Playwright E2E tests.
 * Used by full-marketplace-journey.spec.ts and other agent-focused tests.
 */

import { Page, expect } from '@playwright/test'

// ─── types ────────────────────────────────────────────────────────────────────

export interface QScoreSnapshot {
  overall: number
  timestamp: string
}

// ─── chat helpers ─────────────────────────────────────────────────────────────

/** Returns the send button inside the chat input area. */
function sendButton(page: Page) {
  return page
    .locator('div')
    .filter({ has: page.locator('textarea') })
    .last()
    .locator('button')
    .last()
}

/**
 * Navigate to an agent page, type a message, and wait for the response.
 * Times out after 90s to allow for LLM latency.
 */
export async function chatWithAgent(
  page: Page,
  agentId: string,
  message: string,
  opts?: { timeout?: number },
): Promise<void> {
  const timeout = opts?.timeout ?? 90_000

  // Navigate if not already there
  const currentUrl = page.url()
  if (!currentUrl.includes(`/cxo/${agentId}`) && !currentUrl.includes(`/agents/${agentId}`)) {
    await page.goto(`/founder/cxo/${agentId}`)
    await page.waitForLoadState('networkidle')
  }

  const textarea = page.locator('textarea').last()
  await expect(textarea).toBeVisible({ timeout: 15_000 })
  await textarea.fill(message)
  await sendButton(page).click()

  // Wait for a response — either a new message bubble or an artifact card
  await page.waitForSelector(
    '[data-testid="agent-response"], [class*="message"], [class*="artifact"], [class*="deliverable"]',
    { timeout, state: 'attached' },
  ).catch(async () => {
    // Fallback: wait for any new text content after sending
    await page.waitForFunction(
      () => document.body.innerText.length > 500,
      { timeout: timeout / 2 },
    )
  })

  // Give streaming responses time to complete
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
}

/**
 * Wait for an artifact card/panel of a specific type to appear.
 * Checks for the type label or common keywords.
 */
export async function waitForArtifactCard(
  page: Page,
  artifactType: string,
  timeout = 90_000,
): Promise<void> {
  // Normalize type to title case keywords for visual matching
  const typeLabel = artifactType.replace(/_/g, ' ')

  await page.waitForFunction(
    (label: string) => {
      const body = document.body.innerText.toLowerCase()
      return body.includes(label.toLowerCase()) || body.includes('deliverable') || body.includes('generated')
    },
    typeLabel,
    { timeout },
  )
}

/**
 * Assert that at least `minMatches` of the provided keywords appear in visible text.
 */
export async function assertViewerKeywords(
  page: Page,
  keywords: string[],
  minMatches = 2,
): Promise<void> {
  const bodyText = await page.locator('body').innerText()
  const lower = bodyText.toLowerCase()
  const matched = keywords.filter(k => lower.includes(k.toLowerCase()))
  expect(
    matched.length,
    `Expected ≥${minMatches} keywords from [${keywords.join(', ')}] but found ${matched.length}: [${matched.join(', ')}]`,
  ).toBeGreaterThanOrEqual(minMatches)
}

// ─── Q-Score helpers ──────────────────────────────────────────────────────────

/**
 * Navigate to the founder dashboard and read the Q-Score value.
 * Returns 0 if no score is visible yet.
 */
export async function getQScoreFromDashboard(page: Page): Promise<number> {
  const currentUrl = page.url()
  if (!currentUrl.includes('/founder/dashboard') && !currentUrl.includes('/founder')) {
    await page.goto('/founder/dashboard')
    await page.waitForLoadState('networkidle')
  }

  // Q-Score typically shown as a large number, 0-100
  const scoreLocator = page.locator(
    '[data-testid="qscore-value"], [class*="q-score"] span, [class*="qscore"] span, text=/^\\d{1,3}$/'
  ).first()

  try {
    await scoreLocator.waitFor({ state: 'visible', timeout: 15_000 })
    const text = await scoreLocator.innerText()
    const parsed = parseInt(text.trim(), 10)
    return isNaN(parsed) ? 0 : parsed
  } catch {
    return 0
  }
}

/**
 * Fetch Q-Score via API (more reliable than DOM scraping).
 * Calls GET /api/qscore/latest within the page's auth context.
 */
export async function getQScoreViaAPI(page: Page): Promise<number> {
  const result = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/qscore/latest', {
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) return 0
      const data = await res.json() as {
        qScore?: { overall?: number; rawOverall?: number }
        overall_score?: number
        score?: number
      }
      // /api/qscore/latest returns { qScore: { overall: N } }
      return data.qScore?.overall ?? data.qScore?.rawOverall ?? data.overall_score ?? data.score ?? 0
    } catch {
      return 0
    }
  })
  return result
}

/**
 * Build a Q-Score snapshot for before/after comparison.
 */
export async function snapshotQScore(page: Page, label: string): Promise<QScoreSnapshot> {
  const score = await getQScoreViaAPI(page)
  const snapshot: QScoreSnapshot = { overall: score, timestamp: new Date().toISOString() }
  console.log(`  📊 Q-Score [${label}]: ${score}`)
  return snapshot
}

// ─── profile builder helpers ──────────────────────────────────────────────────

/**
 * Navigate to profile builder and fill a section chat input.
 * The profile builder uses a chat-like interface per section.
 */
export async function fillProfileBuilderSection(
  page: Page,
  answer: string,
  timeout = 30_000,
): Promise<void> {
  const textarea = page.locator('textarea').last()
  await expect(textarea).toBeVisible({ timeout: 15_000 })
  await textarea.fill(answer)
  await sendButton(page).click()

  // Wait for acknowledgement (section advances or response appears)
  await page.waitForFunction(
    () => {
      const els = document.querySelectorAll('textarea')
      // Section advanced (textarea cleared) OR new content appeared
      return Array.from(els).some(el => (el as HTMLTextAreaElement).value === '')
    },
    { timeout },
  ).catch(() => {}) // Non-fatal — section may use a different state pattern
}

/**
 * Submit the profile builder (click the final "Calculate Q-Score" CTA).
 */
export async function submitProfileBuilder(page: Page): Promise<void> {
  const cta = page.locator(
    'button:has-text("Calculate"), button:has-text("Q-Score"), button:has-text("Submit"), button:has-text("Complete")'
  ).last()
  await expect(cta).toBeVisible({ timeout: 30_000 })
  await cta.click()
  // Wait for redirect away from profile builder
  await page.waitForURL(/\/founder\/dashboard|\/founder\/improve/, { timeout: 30_000 }).catch(() => {})
}

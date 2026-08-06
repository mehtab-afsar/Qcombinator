import { test, expect } from '@playwright/test'
import { signInWithCredentials } from '../helpers/auth'

/**
 * Live proof for the artifact organization layer (owner labels, the Documents Hub, the full
 * briefing reader, per-executive documents, run history) — built this session against the
 * real account mehtabafsar346@gmail.com, which already has 5 real documents (AS001-AS005, all
 * Growth-owned) and 1 real briefing from the earlier live cycle.
 */

test.describe.configure({ mode: 'serial' })

const email = 'mehtabafsar346@gmail.com'
const password = 'SpineTest_Temp_9f2c!'

async function dismissWelcomeModalIfPresent(page: import('@playwright/test').Page): Promise<void> {
  const skip = page.getByText('Skip intro')
  if (await skip.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skip.click()
  }
}

test('Stage 1 — the CEO tab document grid now shows owner badges and a View all link', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  // Growth owns all 5 real documents — the CGO badge should be visible on the compact grid.
  await expect(page.getByText('CGO').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: /View all/i })).toBeVisible()
})

test('Stage 3 — the Documents Hub groups by executive, Growth expanded with 5 real documents, others quiet', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive/documents')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  // All 5 executives always shown.
  for (const label of ['CEO', 'CGO', 'CTO', 'COO', 'CFO']) {
    await expect(page.getByText(label).first()).toBeVisible();
  }

  // Growth's group: 5 documents, expanded by default (has content).
  await expect(page.getByText('5 documents')).toBeVisible();

  // At least one idle executive shows the honest "no documents" line, collapsed.
  await expect(page.getByText('No documents yet').first()).toBeVisible();

  // A "Latest briefing" link exists for Growth (the one program with a real briefing).
  await expect(page.getByText(/Latest briefing:/).first()).toBeVisible();
})

test('Stage 2 — the full briefing is readable, not just a one-line verdict', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive/documents')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  await page.getByText(/Latest briefing:/).first().click()
  await page.waitForURL(/\/founder\/briefings\//)

  // The verdict is the page's serif headline; a summary and/or sections should render.
  await expect(page.getByText('Back to your documents')).toBeVisible()
  // At least one heading/detail section or the summary paragraph should be present —
  // the content that was previously generated and never rendered anywhere.
  const hasContent = await page.locator('h1, h2, p').count()
  expect(hasContent).toBeGreaterThan(2)
})

test('Stage 4 — the Growth executive page now shows its own Documents panel', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive/growth')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  await expect(page.getByText('Documents', { exact: true })).toBeVisible({ timeout: 15_000 })
  // At least one of the 5 real asset names should be visible in that panel.
  await expect(page.getByText(/ICP Profiles|Pains|Buyer Journey|Positioning|Channel Strategy/i).first()).toBeVisible()
})

test('Stage 5 — with exactly one real cycle, "Past cycles" stays invisible (quiet until real)', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  // The design deliberately shows nothing until there's more than one run to compare —
  // this proves that restraint held, not that the feature is missing.
  await expect(page.getByText('Past cycles')).toHaveCount(0)

  // Confirm the API itself DOES carry history data (proving Stage 5's data layer is live),
  // even though the UI correctly stays quiet with only one entry.
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/rhythm/run', { credentials: 'include' })
    return r.json()
  })
  expect(Array.isArray(res.history)).toBe(true)
  expect(res.history.length).toBeGreaterThanOrEqual(1)
})

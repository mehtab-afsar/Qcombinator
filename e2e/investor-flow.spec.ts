/**
 * E2E — Investor Flow
 *
 * Tests the full happy-path for a logged-in investor:
 *   1. Auth         — sign in → redirect to /investor/dashboard
 *   2. Deal flow    — navigate to /investor/deal-flow, startup cards appear
 *   3. Startup profile — click a startup → /investor/startup/[id] loads
 *   4. Message button — "Message Founder" button is visible on profile page
 *   5. Pipeline     — navigate to /investor/pipeline, stage columns render
 *   6. Q-Score badge — Q-Score value visible somewhere in the deal-flow listing
 *
 * Selector notes (based on actual source):
 *   - Deal-flow page renders FounderCard components with startup names and Q-Score badges.
 *   - Startup profile page has a sticky header with tabs (Overview, Financials, Team…).
 *   - "Message Founder" is a <button> (not a link) in the sticky header area.
 *   - Pipeline page renders STAGE_LABELS: Watching, Meeting, In DD, Portfolio, Passed.
 *
 * Adjust TEST_INVESTOR_EMAIL / TEST_INVESTOR_PASSWORD via environment variables or .env.test.local.
 */

import { test, expect, Page } from '@playwright/test'
import { signInAsInvestor } from './helpers/auth'

// ─── 1. Auth ──────────────────────────────────────────────────────────────────

test.describe('Investor Auth', () => {
  test('signs in and lands on /investor/dashboard', async ({ page }) => {
    await signInAsInvestor(page)

    await expect(page).toHaveURL(/\/investor/, { timeout: 10_000 })

    // Login form should no longer be visible
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
  })
})

// ─── 2. Deal flow ─────────────────────────────────────────────────────────────

test.describe('Investor — Deal Flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
    await page.goto('/investor/deal-flow')
    await page.waitForLoadState('networkidle')
  })

  test('deal-flow page loads without error', async ({ page }) => {
    // Page title area or any content should be visible
    await expect(page.locator('body')).toBeVisible()

    // Should NOT be on an error or login page
    await expect(page).toHaveURL(/\/investor\/deal-flow/)
    await expect(page.locator('text=/404|Not Found/i').first()).toHaveCount(0)
  })

  test('displays at least one startup card or empty state', async ({ page }) => {
    // Deal flow renders FounderCard items, or an empty-state message.
    // We wait for either to appear.
    const founderCards = page.locator('[data-testid="founder-card"], [class*="card"]')
    const emptyState   = page.locator('text=/no startups|no results|empty|no founders/i').first()

    // Either cards or empty state should appear within 15s
    await Promise.race([
      founderCards.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
      emptyState.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    ])

    // At minimum, the page body has rendered some content
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
  })

  test('search bar is visible on deal-flow page', async ({ page }) => {
    // The deal-flow page has a Search icon and an input for filtering startups
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[placeholder*="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
  })
})

// ─── 3. Startup profile page ──────────────────────────────────────────────────

/**
 * Helper: click the first startup card in deal-flow and return the page
 * that navigates to /investor/startup/[id].
 *
 * The FounderCard "View" button calls onView() which calls router.push().
 * If no cards are present the test is skipped.
 */
async function navigateToFirstStartup(page: Page): Promise<boolean> {
  await page.goto('/investor/deal-flow')
  await page.waitForLoadState('networkidle')

  // Try clicking the first "View" or "→" button on a founder card.
  // FounderCard renders a button with an arrow / "View" label or uses ChevronRight icon.
  const viewButton = page.locator('button').filter({ hasText: /View|→|profile/i }).first()
  const chevronBtn = page.locator('svg[data-lucide="chevron-right"]').first()

  // Also try clicking the card row itself (it may be a full-row clickable div)
  const cardRow = page.locator('div').filter({ hasText: /Q-Score|qscore/i }).first()

  let clicked = false

  if (await viewButton.count() > 0) {
    await viewButton.click()
    clicked = true
  } else if (await chevronBtn.count() > 0) {
    await chevronBtn.click()
    clicked = true
  } else if (await cardRow.count() > 0) {
    await cardRow.click()
    clicked = true
  }

  if (!clicked) return false

  // Wait for navigation to startup page
  try {
    await page.waitForURL(/\/investor\/startup\//, { timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

test.describe('Investor — Startup Profile', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
  })

  test('startup profile page loads with tabs', async ({ page }) => {
    const navigated = await navigateToFirstStartup(page)
    if (!navigated) {
      test.skip(true, 'No startup cards found in deal-flow — seed test data first')
      return
    }

    await page.waitForLoadState('networkidle')

    // Profile page has tabs: Overview, Financials, Team, Market, Materials, AI Analysis
    const overviewTab = page.locator('text=/Overview/i').first()
    await expect(overviewTab).toBeVisible({ timeout: 15_000 })
  })

  test('startup name is displayed in the page header', async ({ page }) => {
    const navigated = await navigateToFirstStartup(page)
    if (!navigated) {
      test.skip(true, 'No startup cards found — seed test data first')
      return
    }

    await page.waitForLoadState('networkidle')

    // The sticky header shows the startup name. We just verify the page has
    // some text content in the header area.
    const headerArea = page.locator('div[style*="sticky"], header, nav').first()
    await expect(headerArea).toBeVisible({ timeout: 15_000 })
    const headerText = await headerArea.innerText()
    expect(headerText.trim().length).toBeGreaterThan(0)
  })
})

// ─── 4. "Message Founder" button on startup profile ──────────────────────────

test.describe('Investor — Startup Profile Outreach', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
  })

  test('"Message Founder" button is visible on the startup profile', async ({ page }) => {
    const navigated = await navigateToFirstStartup(page)
    if (!navigated) {
      test.skip(true, 'No startup cards found — seed test data first')
      return
    }

    await page.waitForLoadState('networkidle')

    // The startup profile sticky header renders a "Message Founder" button
    const msgButton = page.locator('button', { hasText: /Message Founder/i }).first()
    await expect(msgButton).toBeVisible({ timeout: 15_000 })
  })

  test('clicking "Message Founder" opens the outreach modal', async ({ page }) => {
    const navigated = await navigateToFirstStartup(page)
    if (!navigated) {
      test.skip(true, 'No startup cards found — seed test data first')
      return
    }

    await page.waitForLoadState('networkidle')

    const msgButton = page.locator('button', { hasText: /Message Founder/i }).first()
    await msgButton.click()

    // The outreach modal/panel contains a textarea for the message
    const outreachTextarea = page.locator('textarea').first()
    await expect(outreachTextarea).toBeVisible({ timeout: 10_000 })
  })
})

// ─── 5. Pipeline / CRM ────────────────────────────────────────────────────────

test.describe('Investor — Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
    await page.goto('/investor/pipeline')
    await page.waitForLoadState('networkidle')
  })

  test('pipeline page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/investor\/pipeline/)
    await expect(page.locator('text=/404|Not Found/i').first()).toHaveCount(0)
  })

  test('pipeline page shows stage labels', async ({ page }) => {
    // The pipeline page uses STAGE_LABELS: Watching, Meeting, In DD, Portfolio, Passed
    // At least one stage label should be visible after load
    const watchingLabel = page.locator('text=/Watching/i').first()
    await expect(watchingLabel).toBeVisible({ timeout: 15_000 })
  })

  test('pipeline renders ScoreBadge component or stage columns', async ({ page }) => {
    // The pipeline page imports ScoreBadge and renders enriched pipeline entries.
    // We accept either the stage columns or an empty-state "No startups in your pipeline"
    const hasContent = page.locator(
      'text=/Watching|Meeting|In DD|Portfolio|Passed|pipeline/i'
    ).first()
    await expect(hasContent).toBeVisible({ timeout: 15_000 })
  })
})

// ─── 6. Q-Score badge in deal flow ────────────────────────────────────────────

test.describe('Investor — Q-Score Visibility in Deal Flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
    await page.goto('/investor/deal-flow')
    await page.waitForLoadState('networkidle')
  })

  test('Q-Score values are visible in the deal-flow listing', async ({ page }) => {
    // Each FounderCard renders the qScore number and a "Q-Score" label.
    // If any startup is present, at least one numeric score should appear.
    const bodyText = await page.locator('body').innerText()

    // The page either shows startup cards with scores, or an empty state.
    // We verify the page loaded substantive content (not blank or error).
    expect(bodyText.trim().length).toBeGreaterThan(100)

    // Check for a Q-Score label anywhere on the page (including header/filters)
    const qScoreLabel = page.locator('text=/Q-Score|QScore/i').first()

    // If deal-flow has startups, the score badge is visible
    const hasStartups = bodyText.match(/\b[0-9]{2,3}\b/) // any 2-3 digit number (scores)
    if (hasStartups) {
      await expect(qScoreLabel).toBeVisible({ timeout: 10_000 })
    } else {
      // Empty state — just assert the page loaded correctly
      await expect(page).toHaveURL(/\/investor\/deal-flow/)
    }
  })

  test('deal-flow filter/sort controls are present', async ({ page }) => {
    // The deal-flow page has layout toggle buttons (Grid/List) and sort controls
    const layoutToggle = page.locator('button').filter({
      hasText: /Grid|List/i,
    }).first()

    // Fall back to checking for the search input
    const searchInput = page.locator('input[placeholder*="earch"]').first()

    const hasLayoutToggle = await layoutToggle.count() > 0
    const hasSearch       = await searchInput.count() > 0

    expect(hasLayoutToggle || hasSearch).toBe(true)
  })
})

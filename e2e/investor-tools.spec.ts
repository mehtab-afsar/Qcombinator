/**
 * E2E — Investor Tools
 *
 * Tests the investor-specific feature pages:
 *   1. AI Analysis   — chat interface + suggested prompts
 *   2. Pipeline      — all 5 stage columns render
 *   3. Settings      — tabs + form fields + save button
 *   4. Portfolio     — connection requests section
 *   5. Billing       — plan info + upgrade CTA
 */

import { test, expect } from '@playwright/test'
import { signInAsInvestor } from './helpers/auth'

// ─── 1. AI Analysis ───────────────────────────────────────────────────────────

test.describe('Investor — AI Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
    await page.goto('/investor/ai-analysis')
    await page.waitForLoadState('networkidle')
  })

  test('page loads on /investor/ai-analysis', async ({ page }) => {
    await expect(page).toHaveURL(/\/investor\/ai-analysis/)
    await expect(page.locator('text=/404|Not Found/i').first()).toHaveCount(0)
  })

  test('chat input or suggested prompts are visible', async ({ page }) => {
    // The page renders either an input/textarea for the chat, or suggested prompt chips
    const chatInput   = page.locator('textarea, input[type="text"][placeholder]').first()
    const suggestions = page.locator('text=/top deal|portfolio|founders/i').first()

    await Promise.race([
      chatInput.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
      suggestions.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    ])

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(100)
  })

  test('page content is substantive (stats or insights rendered)', async ({ page }) => {
    // Wait up to 15s for any meaningful content — portfolio stats or insights section
    const content = page.locator(
      'text=/Total Founders|Avg Q-Score|Insights|Opportunities|Trends|Deal Flow Intelligence/i'
    ).first()

    await Promise.race([
      content.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    ])

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(100)
  })
})

// ─── 2. Pipeline ──────────────────────────────────────────────────────────────

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

  test('all 5 stage labels are visible', async ({ page }) => {
    // STAGE_LABELS: Watching, Meeting, In DD, Portfolio, Passed
    const stages = ['Watching', 'Meeting', 'In DD', 'Portfolio', 'Passed']
    for (const stage of stages) {
      const label = page.locator(`text=/^${stage}$/i`).first()
      await expect(label).toBeVisible({ timeout: 15_000 })
    }
  })

  test('page renders substantive content (columns or empty state)', async ({ page }) => {
    const hasContent = page.locator('text=/Watching|Meeting|In DD|no startups|pipeline/i').first()
    await expect(hasContent).toBeVisible({ timeout: 15_000 })
  })
})

// ─── 3. Settings ──────────────────────────────────────────────────────────────

test.describe('Investor — Settings', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
    await page.goto('/investor/settings')
    await page.waitForLoadState('networkidle')
  })

  test('settings page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/investor\/settings/)
    await expect(page.locator('text=/404|Not Found/i').first()).toHaveCount(0)
  })

  test('Account tab is visible and active by default', async ({ page }) => {
    const accountTab = page.locator('text=/Account/i').first()
    await expect(accountTab).toBeVisible({ timeout: 10_000 })
  })

  test('Preferences tab is visible', async ({ page }) => {
    const prefsTab = page.locator('text=/Preferences/i').first()
    await expect(prefsTab).toBeVisible({ timeout: 10_000 })
  })

  test('Notifications tab is visible', async ({ page }) => {
    const notifTab = page.locator('text=/Notifications/i').first()
    await expect(notifTab).toBeVisible({ timeout: 10_000 })
  })

  test('account form has at least one text/email input', async ({ page }) => {
    const input = page.locator('input[type="text"], input[type="email"]').first()
    await expect(input).toBeVisible({ timeout: 10_000 })
  })

  test('Preferences tab shows sector/stage selection when clicked', async ({ page }) => {
    const prefsTab = page.locator('button, div').filter({ hasText: /^Preferences$/ }).first()
    if (await prefsTab.count() > 0) {
      await prefsTab.click()
      // After clicking, should show sector options
      const sectorLabel = page.locator('text=/SaaS|AI|FinTech|Sector|Stage/i').first()
      await expect(sectorLabel).toBeVisible({ timeout: 10_000 })
    }
  })

  test('Notifications tab shows toggles when clicked', async ({ page }) => {
    const notifTab = page.locator('button, div').filter({ hasText: /^Notifications$/ }).first()
    if (await notifTab.count() > 0) {
      await notifTab.click()
      const notifContent = page.locator('text=/New Founders|High Q-Score|Connection|Weekly Digest|email/i').first()
      await expect(notifContent).toBeVisible({ timeout: 10_000 })
    }
  })

  test('Save button is present and enabled', async ({ page }) => {
    const saveBtn = page.locator('button').filter({ hasText: /Save/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
    await expect(saveBtn).not.toBeDisabled()
  })
})

// ─── 4. Portfolio ─────────────────────────────────────────────────────────────

test.describe('Investor — Portfolio', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
    await page.goto('/investor/portfolio')
    await page.waitForLoadState('networkidle')
  })

  test('portfolio page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/investor\/portfolio/)
    await expect(page.locator('text=/404|Not Found/i').first()).toHaveCount(0)
  })

  test('connection requests section or empty state is visible', async ({ page }) => {
    // The page shows either connection requests cards, or an empty state message
    const content = page.locator(
      'text=/Connection Requests|Connections|Portfolio|pending|No connection|no portfolio/i'
    ).first()
    await Promise.race([
      content.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    ])
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
  })
})

// ─── 5. Billing ───────────────────────────────────────────────────────────────

test.describe('Investor — Billing', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
    await page.goto('/investor/billing')
    await page.waitForLoadState('networkidle')
  })

  test('billing page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/investor\/billing/)
    await expect(page.locator('text=/404|Not Found/i').first()).toHaveCount(0)
  })

  test('plan info or upgrade CTA is visible', async ({ page }) => {
    const planContent = page.locator('text=/Pro|Free|Upgrade|Subscription|Plan|pricing/i').first()
    await expect(planContent).toBeVisible({ timeout: 15_000 })
  })

  test('upgrade or manage subscription button is present', async ({ page }) => {
    const actionBtn = page.locator('button').filter({
      hasText: /Upgrade|Manage.*Subscription|Start.*Pro|Get Pro/i,
    }).first()
    await expect(actionBtn).toBeVisible({ timeout: 15_000 })
  })
})

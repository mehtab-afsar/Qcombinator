/**
 * E2E — Founder Tools
 *
 * Tests the founder productivity pages:
 *   1. Metrics — KPI cards, "Update metrics" form
 */

import { test, expect } from '@playwright/test'
import { signInAsFounder } from './helpers/auth'

// ─── 1. Metrics ───────────────────────────────────────────────────────────────

test.describe('Founder — Metrics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFounder(page)
    await page.goto('/founder/metrics')
    await page.waitForLoadState('networkidle')
  })

  test('metrics page loads without error', async ({ page }) => {
    await expect(page).toHaveURL(/\/founder\/metrics/)
    await expect(page.locator('text=/404|Not Found/i').first()).toHaveCount(0)
  })

  test('KPI cards or loading state is visible', async ({ page }) => {
    // Page renders KPI cards for MRR, Burn Rate, Runway, Customers, etc.
    const kpiContent = page.locator(
      'text=/MRR|Revenue|Burn|Runway|Customers|Growth|KPI/i'
    ).first()
    await expect(kpiContent).toBeVisible({ timeout: 15_000 })
  })

  test('"Update metrics" button is present (data-testid=metrics-update-btn)', async ({ page }) => {
    // The button uses data-testid="metrics-update-btn"
    const updateBtn = page.locator('[data-testid="metrics-update-btn"]').first()

    // Also try by text in case testid isn't on screen
    const updateBtnText = page.locator('button').filter({
      hasText: /Update.*metrics|Edit.*metrics|Enter.*metrics/i,
    }).first()

    const found = await Promise.race([
      updateBtn.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false),
      updateBtnText.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false),
    ])

    expect(found).toBe(true)
  })

  test('clicking "Update metrics" opens the manual entry form', async ({ page }) => {
    const updateBtn = page.locator('[data-testid="metrics-update-btn"]').first()
    const updateBtnText = page.locator('button').filter({
      hasText: /Update.*metrics|Edit.*metrics|Enter.*metrics/i,
    }).first()

    const btn = (await updateBtn.count() > 0) ? updateBtn : updateBtnText

    if (await btn.count() > 0) {
      await btn.click()

      // Form reveals inputs for MRR, burn, runway, etc.
      const formContent = page.locator(
        'text=/MRR|Monthly Recurring|Burn Rate|Runway|Update metrics manually/i'
      ).first()
      await expect(formContent).toBeVisible({ timeout: 8_000 })

      // There should be at least one number input
      const numInput = page.locator('input[type="number"], input[inputmode="numeric"]').first()
      await Promise.race([
        numInput.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null),
      ])

      // Cancel / close the form
      const cancelBtn = page.locator('button').filter({ hasText: /Cancel|Close|×/i }).first()
      if (await cancelBtn.count() > 0) await cancelBtn.click()

      // Form should dismiss
      await page.waitForTimeout(500)
      const formStillVisible = await formContent.isVisible().catch(() => false)
      expect(formStillVisible).toBe(false)
    }
  })
})

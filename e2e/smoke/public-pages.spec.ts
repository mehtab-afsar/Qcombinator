/**
 * E2E Smoke — Public Pages
 *
 * Verifies unauthenticated public pages render without errors.
 * These tests run without any auth session.
 */

import { test, expect } from '@playwright/test'

test.describe('Public Pages — Smoke Tests', () => {
  test('landing page / renders hero content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The landing page should not redirect to login — it's public
    await expect(page).not.toHaveURL(/\/login/)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(50)
    expect(bodyText).not.toMatch(/This page could not be found|404/i)
  })

  test('/login page renders email + password form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('/investor/onboarding choice screen renders', async ({ page }) => {
    await page.goto('/investor/onboarding')
    await page.waitForLoadState('networkidle')

    const hero = page.locator('text=/already scored|Deal flow/i').first()
    await expect(hero).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('text=/404/i').first()).toHaveCount(0)
  })

  test('/feed page loads or redirects to login gracefully', async ({ page }) => {
    await page.goto('/feed')
    await page.waitForLoadState('networkidle')

    // Either it renders feed content OR redirects to login — both are acceptable
    const isOnLogin = page.url().includes('/login')
    if (!isOnLogin) {
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(50)
      expect(bodyText).not.toMatch(/This page could not be found|404/i)
    } else {
      await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 8_000 })
    }
  })

  test('/library page loads or redirects to login gracefully', async ({ page }) => {
    await page.goto('/library')
    await page.waitForLoadState('networkidle')

    const isOnLogin = page.url().includes('/login')
    if (!isOnLogin) {
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(50)
      expect(bodyText).not.toMatch(/This page could not be found|404/i)
    } else {
      await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 8_000 })
    }
  })

  test('/reset-password page renders a form', async ({ page }) => {
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle')

    // Should render a password reset form, not a 404
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(20)
    expect(bodyText).not.toMatch(/This page could not be found|404/i)
  })
})

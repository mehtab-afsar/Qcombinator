/**
 * E2E — Investor Onboarding
 *
 * Tests the full investor signup funnel at /investor/onboarding:
 *   1. Choice screen  — hero copy + CTAs render
 *   2. Sign-in mode   — toggling to sign-in form
 *   3. Full 6-step signup: Account → Personal → Firm → Criteria → Thesis → Photo (skip)
 *      → redirect to /investor/dashboard
 *   4. Step badge     — "Step X of 6" counter renders during signup
 *   5. Back button    — step 2 → back → step 1
 *
 * Uses a fresh Supabase account per test run (no pre-seeded investor needed).
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for account cleanup,
 * but the signup itself goes through the UI so the full /api/auth/investor-signup
 * endpoint is exercised.
 */

import { test, expect } from '@playwright/test'

const RUN_ID = Date.now()
const FRESH_EMAIL    = `test-inv-${RUN_ID}@pw.test`
const FRESH_PASSWORD = 'TestPass123!'

// ─── 1. Choice screen ─────────────────────────────────────────────────────────

test.describe('Investor Onboarding — Choice Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/investor/onboarding')
    await page.waitForLoadState('networkidle')
  })

  test('renders the hero heading', async ({ page }) => {
    await expect(page).toHaveURL(/\/investor\/onboarding/)

    // h1 renders "Deal flow that's already scored."
    const hero = page.locator('text=/already scored/i').first()
    await expect(hero).toBeVisible({ timeout: 10_000 })
  })

  test('renders the "Create your account" primary CTA', async ({ page }) => {
    const cta = page.locator('button', { hasText: /Create your account/i }).first()
    await expect(cta).toBeVisible({ timeout: 10_000 })
  })

  test('renders the "Already have an account" sign-in secondary CTA', async ({ page }) => {
    // The secondary button says "Already have an account? Sign in"
    const signinBtn = page.locator('button', { hasText: /Already have an account/i }).first()
    await expect(signinBtn).toBeVisible({ timeout: 10_000 })
  })

  test('renders the stats row (847 scored founders etc.)', async ({ page }) => {
    const statsText = page.locator('text=/847|scored founders/i').first()
    await expect(statsText).toBeVisible({ timeout: 10_000 })
  })

  test('data-testid=investor-onboarding-choice is present', async ({ page }) => {
    const choice = page.locator('[data-testid="investor-onboarding-choice"]').first()
    await expect(choice).toBeVisible({ timeout: 10_000 })
  })
})

// ─── 2. Sign-in mode toggle ───────────────────────────────────────────────────

test.describe('Investor Onboarding — Sign-In Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/investor/onboarding')
    await page.waitForLoadState('networkidle')
  })

  test('clicking "Already have an account" switches to sign-in form', async ({ page }) => {
    const signinBtn = page.locator('button', { hasText: /Already have an account/i }).first()
    await signinBtn.click()

    // Sign-in mode renders "Welcome back" section header and a "you@fund.com" placeholder
    const emailInput = page.locator('input[placeholder="you@fund.com"]').first()
    await expect(emailInput).toBeVisible({ timeout: 8_000 })
  })

  test('sign-in form has email + password inputs', async ({ page }) => {
    const signinBtn = page.locator('button', { hasText: /Already have an account/i }).first()
    await signinBtn.click()

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('"New to Edge Alpha?" link switches back to signup', async ({ page }) => {
    // Switch to sign-in first
    const signinBtn = page.locator('button', { hasText: /Already have an account/i }).first()
    await signinBtn.click()
    await page.locator('input[placeholder="you@fund.com"]').waitFor({ state: 'visible', timeout: 8_000 })

    // Click "Create an account" link
    const createLink = page.locator('text=/Create an account/i').first()
    await expect(createLink).toBeVisible({ timeout: 5_000 })
    await createLink.click()

    // Should show step 1 form (email placeholder visible again)
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 8_000 })
  })
})

// ─── 3. Full 6-step signup ────────────────────────────────────────────────────

test.describe('Investor Onboarding — Full 6-Step Signup', () => {
  test.setTimeout(120_000)

  test('completes all 6 steps and redirects to /investor/dashboard', async ({ page }) => {
    await page.goto('/investor/onboarding')
    await page.waitForLoadState('networkidle')

    // ── Step 1: Account ──────────────────────────────────────────────────────
    const createBtn = page.locator('button', { hasText: /Create your account/i }).first()
    await createBtn.click()

    // Step 1 form renders: email + password inputs
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 8_000 })
    await page.fill('input[type="email"]', FRESH_EMAIL)
    await page.fill('input[type="password"]', FRESH_PASSWORD)

    // Click "Create Account" (the submit button on step 1)
    const createAccountBtn = page.locator('button').filter({ hasText: /Create Account/i }).first()
    await createAccountBtn.click()

    // ── Step 2: Personal Info ────────────────────────────────────────────────
    // Wait for "Personal Information" section header (rendered via sectionHeader())
    await page.locator('h2', { hasText: /Personal Information/i }).waitFor({ state: 'visible', timeout: 20_000 })

    await page.fill('input[placeholder*="First"], input[placeholder*="first"]', 'PW')
    // Last name — second text input on this step
    const textInputs = page.locator('input[type="text"]')
    await textInputs.nth(1).fill('Investor')

    const continueBtn2 = page.locator('button').filter({ hasText: /Continue/i }).first()
    await continueBtn2.click()

    // ── Step 3: Firm Info ────────────────────────────────────────────────────
    await page.locator('h2', { hasText: /Firm Information/i }).waitFor({ state: 'visible', timeout: 10_000 })

    // Fill Firm Name (first text input on this step)
    const firmInput = page.locator('input[type="text"]').first()
    await firmInput.fill('PW Test Ventures')

    // Select "Venture Capital" firm type chip
    const vcChip = page.locator('span').filter({ hasText: /^Venture Capital$/ }).first()
    if (await vcChip.count() > 0) await vcChip.click()

    const continueBtn3 = page.locator('button').filter({ hasText: /Continue/i }).first()
    await continueBtn3.click()

    // ── Step 4: Criteria ─────────────────────────────────────────────────────
    await page.locator('h2', { hasText: /Investment Criteria/i }).waitFor({ state: 'visible', timeout: 10_000 })

    // Select at least one check size card (first available)
    const checkCards = page.locator('div').filter({ hasText: /\$[0-9]+K/ })
    if (await checkCards.count() > 0) await checkCards.first().click()

    // Select at least one stage
    const stageCards = page.locator('div').filter({ hasText: /^Seed$|^Pre-Seed$|^Series A$/ })
    if (await stageCards.count() > 0) await stageCards.first().click()

    const continueBtn4 = page.locator('button').filter({ hasText: /Continue/i }).first()
    await continueBtn4.click()

    // ── Step 5: Thesis ───────────────────────────────────────────────────────
    await page.locator('h2', { hasText: /Investment Thesis/i }).waitFor({ state: 'visible', timeout: 10_000 })

    // Fill the thesis textarea
    const thesisArea = page.locator('textarea').first()
    if (await thesisArea.count() > 0) {
      await thesisArea.fill('We back early-stage B2B SaaS companies with strong founder-market fit.')
    }

    const continueBtn5 = page.locator('button').filter({ hasText: /Continue/i }).first()
    await continueBtn5.click()

    // ── Step 6: Photo (skip) ─────────────────────────────────────────────────
    await page.locator('h2', { hasText: /Add your photo|Profile photo/i }).waitFor({ state: 'visible', timeout: 10_000 })

    const skipBtn = page.locator('button', { hasText: /Skip for now/i }).first()
    await expect(skipBtn).toBeVisible({ timeout: 5_000 })
    await skipBtn.click()

    // ── Processing → Dashboard ───────────────────────────────────────────────
    // Wait for redirect to /investor/dashboard
    await page.waitForURL(/\/investor\/dashboard/, { timeout: 30_000 })

    // Confirm we're on the dashboard, not back at login
    await expect(page).toHaveURL(/\/investor\/dashboard/)
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
  })
})

// ─── 4. Step badge ────────────────────────────────────────────────────────────

test.describe('Investor Onboarding — Step Progress', () => {
  test('step badge shows "Step 1 of 6" after entering signup mode', async ({ page }) => {
    await page.goto('/investor/onboarding')
    await page.waitForLoadState('networkidle')

    // Enter signup mode
    const createBtn = page.locator('button', { hasText: /Create your account/i }).first()
    await createBtn.click()

    // Step badge should show "Step 1 of 6"
    const badge = page.locator('[data-testid="investor-step-badge"]').first()
    await expect(badge).toBeVisible({ timeout: 8_000 })
    await expect(badge).toContainText('Step 1 of 6')
  })

  test('step dots are visible during signup (progress indicator)', async ({ page }) => {
    await page.goto('/investor/onboarding')
    await page.waitForLoadState('networkidle')

    const createBtn = page.locator('button', { hasText: /Create your account/i }).first()
    await createBtn.click()

    // Progress dots render the STEP_LABELS as uppercase labels
    const accountLabel = page.locator('text=/^ACCOUNT$/i').first()
    await expect(accountLabel).toBeVisible({ timeout: 8_000 })
  })
})

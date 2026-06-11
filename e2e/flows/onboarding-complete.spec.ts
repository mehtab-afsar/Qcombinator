import { test, expect } from '@playwright/test'
import { makeAuthenticatedRequest } from '../helpers/auth'

test.describe.configure({ mode: 'serial' })

const RUN = Date.now()
const EMAIL = `test-ob-${RUN}@edge-alpha.pw`
const PASS = 'EdgeAlpha123!'

test('Step 1: Account fields are required', async ({ page }) => {
  await page.goto('/founder/onboarding')
  await page.waitForLoadState('networkidle')

  // Assert heading
  const heading = page.locator('text=/create your account/i')
  await expect(heading).toBeVisible()

  // Next button should be disabled on empty form
  const nextBtn = page.locator('button:has-text("Next")')
  await expect(nextBtn).toBeDisabled()

  // Fill account fields
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.fill('input[placeholder*="Full name" i], input[placeholder*="name" i]', 'E2E Tester')

  // Next should be enabled
  await expect(nextBtn).toBeEnabled()
})

test('Step 2: Startup info', async ({ page }) => {
  // Continue from step 1
  const nextBtn = page.locator('button:has-text("Next")')
  await nextBtn.click()

  // Wait for step 2
  await page.waitForLoadState('networkidle')
  const step2Heading = page.locator('text=/your startup/i')
  await expect(step2Heading).toBeVisible()

  // Fill startup fields
  await page.fill('input[placeholder*="Company" i], input[placeholder*="company" i]', 'E2E Corp')
  await page.fill('input[placeholder*="tagline" i], input[placeholder*="one" i]', 'Testing the OS')

  // Select industry chip (click first visible chip)
  const industryChips = page.locator('[role="button"]:has-text(/software|robotics|tech|healthcare/i)')
  if (await industryChips.first().isVisible()) {
    await industryChips.first().click()
  }

  // Select stage chip "Building"
  const stageChips = page.locator('[role="button"]:has-text(/building|launching|growing|scaling/i)')
  if (await stageChips.first().isVisible()) {
    await stageChips.first().click()
  }

  await expect(nextBtn).toBeEnabled({ timeout: 5000 })
})

test('Step 3: Traction', async ({ page }) => {
  const nextBtn = page.locator('button:has-text("Next")')
  await nextBtn.click()
  await page.waitForLoadState('networkidle')

  const step3Heading = page.locator('text=/traction|strategy/i')
  await expect(step3Heading).toBeVisible()

  // Select revenue status "Pre-revenue"
  const revenueChips = page.locator('[role="button"]:has-text(/pre-revenue|revenue|bootstrap/i)')
  if (await revenueChips.first().isVisible()) {
    await revenueChips.first().click()
  }

  // Select team size "1-5"
  const teamChips = page.locator('[role="button"]:has-text(/1-5|6-10|11-20|team/i)')
  if (await teamChips.first().isVisible()) {
    await teamChips.first().click()
  }

  // Select funding status "Bootstrapped"
  const fundingChips = page.locator('[role="button"]:has-text(/bootstrap|angel|vc|friends/i)')
  if (await fundingChips.first().isVisible()) {
    await fundingChips.first().click()
  }

  await expect(nextBtn).toBeEnabled({ timeout: 5000 })
})

test('Step 4: Problem → submit', async ({ page }) => {
  const nextBtn = page.locator('button:has-text("Next")')
  await nextBtn.click()
  await page.waitForLoadState('networkidle')

  const step4Heading = page.locator('text=/problem|customer/i')
  await expect(step4Heading).toBeVisible()

  // Fill problem statement
  await page.fill('textarea:nth-of-type(1)', 'We solve grid instability and energy efficiency for renewable energy operators.')

  // Fill target customer
  await page.fill('textarea:nth-of-type(2)', 'VP Engineering at Tier-1 utilities managing grid operations in India.')

  // Click "Create Account" button
  const createBtn = page.locator('button:has-text(/create account|submit|sign up/i)')
  await expect(createBtn).toBeVisible()
  await createBtn.click()

  // Wait for redirect to getting-started page
  await page.waitForURL(/\/founder\/(getting-started|dashboard)/, { timeout: 30_000 })
})

test('DB: founder_profiles row created', async ({ page, context }) => {
  // Ensure we're on founder page
  await page.goto('/founder/dashboard')
  await page.waitForLoadState('networkidle')

  // Make authenticated API call
  const result = await makeAuthenticatedRequest(page, '/api/founder/profile')

  expect(result.status).toBe(200)
  const profile = result.data as Record<string, unknown>

  // Verify profile fields
  expect(profile.company_name).toBeTruthy()
  expect(profile.role).toBe('founder')
  expect(profile.onboarding_completed).toBe(true)
  expect(profile.profile_builder_completed).toBe(false)
  expect(['idea', 'mvp', 'pre-seed', 'seed']).toContain(profile.stage)
})

test('DB: initial Q-Score created at 0', async ({ page }) => {
  await page.goto('/founder/dashboard')
  await page.waitForLoadState('networkidle')

  const result = await makeAuthenticatedRequest(page, '/api/qscore/latest')

  expect(result.status).toBe(200)
  const score = result.data as Record<string, unknown>

  expect(score.overall_score).toBe(0)
  expect(score.data_source).toBe('registration')
})

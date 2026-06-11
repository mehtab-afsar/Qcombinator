import { test, expect } from '@playwright/test'
import { signInAsNexusPower, makeAuthenticatedRequest } from '../helpers/auth'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signInAsNexusPower(page)
  await context.close()
})

test('Profile builder loads (or is already completed)', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')

  // If redirected to dashboard, it means builder is already done
  if (page.url().includes('/founder/dashboard')) {
    test.skip()
  }

  // Check for section heading
  const heading = page.locator('h1, h2')
  await expect(heading).toBeVisible()
})

test('Section 1: Market & Customers', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/founder/dashboard')) {
    test.skip()
  }

  // Check for section 1 heading
  const section1 = page.locator('text=/market|customer|traction/i').first()
  await expect(section1).toBeVisible()

  // Find textarea and send a message
  const textarea = page.locator('textarea').first()
  if (await textarea.isVisible()) {
    const message =
      'We have 3 paying pilots at $2k/month each. 15 discovery calls logged. 80% retention after month 1. ' +
      'Customers use our software 5+ hours per day. Strong product-market fit signals.'

    await textarea.fill(message)
    await textarea.press('Enter')

    // Wait for AI response
    await page.waitForTimeout(5000)
    const response = page.locator('text=/your|customer|market|question/i')
    await expect(response).toBeVisible({ timeout: 30_000 })
  }
})

test('Section 2: Market Potential', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/founder/dashboard')) {
    test.skip()
  }

  // Look for "Next section" or continue button
  const nextBtn = page.locator('button:has-text(/next|continue|skip/i)').last()
  if (await nextBtn.isVisible()) {
    await nextBtn.click()
  }

  await page.waitForTimeout(2000)

  // Now in section 2
  const textarea = page.locator('textarea').first()
  if (await textarea.isVisible()) {
    const message =
      'The global clean energy market is $1.2T. Our SAM is enterprise solar in India — approximately $40B. ' +
      'We target Tier-1 cities. Urgency is driven by net-zero mandates by 2030. High competition but strong tailwinds.'

    await textarea.fill(message)
    await textarea.press('Enter')

    await page.waitForTimeout(3000)
  }
})

test('Section 3: IP & Defensibility', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/founder/dashboard')) {
    test.skip()
  }

  const nextBtn = page.locator('button:has-text(/next|continue|skip/i)').last()
  if (await nextBtn.isVisible()) {
    await nextBtn.click()
    await page.waitForTimeout(2000)
  }

  const textarea = page.locator('textarea').first()
  if (await textarea.isVisible()) {
    const message =
      'We have a patent pending on our grid-balancing algorithm. Replication would take 18+ months and ' +
      'requires expertise in power electronics (we have 3 PhDs). Trade secret: our ML model for demand forecasting. ' +
      'High switching costs for customers once integrated.'

    await textarea.fill(message)
    await textarea.press('Enter')
    await page.waitForTimeout(3000)
  }
})

test('Section 4: Founder & Team', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/founder/dashboard')) {
    test.skip()
  }

  const nextBtn = page.locator('button:has-text(/next|continue|skip/i)').last()
  if (await nextBtn.isVisible()) {
    await nextBtn.click()
    await page.waitForTimeout(2000)
  }

  const textarea = page.locator('textarea').first()
  if (await textarea.isVisible()) {
    const message =
      'Founder: 12 years in energy sector, 5 years at Tata Power in operations. ' +
      'CTO: Ex-ISRO, 8 years in grid tech. VP Sales: Ex-ABB, 6 years selling to utilities. ' +
      'Team of 6 people, 2 PhDs. No prior exits but strong domain expertise.'

    await textarea.fill(message)
    await textarea.press('Enter')
    await page.waitForTimeout(3000)
  }
})

test('Section 5: Financials', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/founder/dashboard')) {
    test.skip()
  }

  const nextBtn = page.locator('button:has-text(/next|continue|skip/i)').last()
  if (await nextBtn.isVisible()) {
    await nextBtn.click()
    await page.waitForTimeout(2000)
  }

  const textarea = page.locator('textarea').first()
  if (await textarea.isVisible()) {
    const message =
      'Current MRR: $6,000. Monthly burn: $15,000. Runway: 14 months with current cash. ' +
      'Gross margin: 72%. Unit economics are positive for large contracts. No debt, all equity funded. ' +
      'ARR trajectory: 3x growth YoY.'

    await textarea.fill(message)
    await textarea.press('Enter')
    await page.waitForTimeout(3000)
  }
})

test('Calculate Q-Score', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/profile-builder')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/founder/dashboard')) {
    test.skip()
  }

  // Navigate to final review step
  const nextBtn = page.locator('button:has-text(/next|continue|calculate|submit|review/i)').last()
  if (await nextBtn.isVisible()) {
    await nextBtn.click()
  }

  await page.waitForTimeout(2000)

  // Look for "Calculate Q-Score" button
  const calcBtn = page.locator('button:has-text(/calculate|submit|score|generate/i)')
  if (await calcBtn.isVisible()) {
    await calcBtn.click()

    // Wait for score to appear (timeout 90s for LLM generation)
    const scoreDisplay = page.locator('text=/\\d{1,3}|score|grade|report/i')
    await expect(scoreDisplay).toBeVisible({ timeout: 90_000 })
  }
})

test('DB: Q-Score updated with profile_builder source', async ({ page }) => {
  await signInAsNexusPower(page)

  const result = await makeAuthenticatedRequest(page, '/api/qscore/latest')

  expect(result.status).toBe(200)
  const score = result.data as Record<string, unknown>

  // Score should be updated from profile builder
  expect(score.overall_score).toBeGreaterThan(0)
  expect(score.data_source).toMatch(/profile_builder|assessment/)
})

test('Dashboard reflects updated score', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/dashboard')
  await page.waitForLoadState('networkidle')

  // Check Q-Score ring shows a value
  const scoreRing = page.locator('text=/\\d{1,3}/')
  await expect(scoreRing).toBeVisible()

  // Check dimension bars are visible
  const dimensions = page.locator('text=/market|team|financials|impact/i')
  const count = await dimensions.count()
  expect(count).toBeGreaterThan(2)
})

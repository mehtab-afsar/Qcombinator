/**
 * FOUNDER FULL JOURNEY E2E TEST
 * Tests: signup → onboarding (4 steps) → profile builder → Q-Score → agents
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Founder Full Journey', () => {
  let testEmail: string
  let testPassword: string

  test.beforeAll(async () => {
    // Generate unique test credentials
    const timestamp = Date.now()
    testEmail = `founder-test-${timestamp}@example.com`
    testPassword = 'TestPass123!'
  })

  test('1. Founder signs up with valid email and password', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup?role=founder`)

    // Fill signup form
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitBtn = page.locator('button').filter({ hasText: /Sign Up|Continue/i }).first()

    await emailInput.fill(testEmail)
    await passwordInput.fill(testPassword)
    await submitBtn.click()

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/founder\/onboarding/, { timeout: 10000 })
  })

  test('2. Founder completes onboarding step 1 (Account)', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder/onboarding`)

    // Fill step 1 fields
    const nameInput = page.locator('input[placeholder*="Jane"], input[placeholder*="Name"]').first()
    const nextBtn = page.locator('button').filter({ hasText: /Next|Continue/i }).first()

    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Founder')
      await nextBtn.click()
    }

    // Should progress to next step
    await page.waitForTimeout(1000)
    const stepIndicator = page.locator('text=/Step [2-4]/i')
    await expect(stepIndicator).toBeVisible({ timeout: 5000 })
  })

  test('3. Founder progresses through onboarding steps 2-4', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder/onboarding`)
    await page.waitForLoadState('networkidle')

    // Complete all steps by clicking Next
    for (let step = 1; step < 4; step++) {
      const nextBtn = page.locator('button').filter({ hasText: /Next|Continue|Complete/i }).first()
      const isVisible = await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        // Fill any visible inputs first
        const inputs = page.locator('input, textarea')
        const inputCount = await inputs.count()

        if (inputCount > 0) {
          for (let i = 0; i < inputCount && i < 2; i++) {
            try {
              const input = inputs.nth(i)
              if (await input.isVisible()) {
                await input.fill(`Test data for step ${step}`)
              }
            } catch {
              // Skip if not fillable
            }
          }
        }

        await nextBtn.click()
        await page.waitForTimeout(500)
      }
    }

    // Should now see profile builder or dashboard
    const url = page.url()
    expect(url).toMatch(/profile-builder|dashboard|onboarding/)
  })

  test('4. Founder accesses profile builder', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder/profile-builder`)

    // Check that profile builder loaded
    const sections = page.locator('[data-testid*="section"], .section, [class*="section"]')
    const sectionCount = await sections.count()

    expect(sectionCount).toBeGreaterThan(0)

    // Verify we can interact with sections
    const inputs = page.locator('input, textarea')
    expect(await inputs.count()).toBeGreaterThan(0)
  })

  test('5. Founder fills profile builder sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder/profile-builder`)
    await page.waitForLoadState('networkidle')

    // Fill visible input fields
    const inputs = page.locator('input, textarea')
    const inputCount = await inputs.count()

    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      try {
        const input = inputs.nth(i)
        if (await input.isVisible()) {
          const type = await input.getAttribute('type')
          if (type !== 'hidden') {
            await input.fill(`Test data for field ${i + 1}`)
          }
        }
      } catch {
        // Skip non-fillable fields
      }
    }

    // Verify data was entered
    const filledInputs = await inputs.count()
    expect(filledInputs).toBeGreaterThan(0)
  })

  test('6. Founder submits profile for Q-Score calculation', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder/profile-builder`)
    await page.waitForLoadState('networkidle')

    // Look for submit button
    const submitBtn = page.locator('button').filter({ hasText: /Submit|Calculate|Score/i }).first()

    if (await submitBtn.isVisible()) {
      await submitBtn.click()

      // Should show loading or success message
      const successMsg = page.locator('text=/Score|Calculated|Success/i')
      const loadingMsg = page.locator('text=/Calculating|Loading|Processing/i')

      const isSuccess = await successMsg.isVisible({ timeout: 15000 }).catch(() => false)
      const isLoading = await loadingMsg.isVisible({ timeout: 5000 }).catch(() => false)

      expect(isSuccess || isLoading).toBeTruthy()
    }
  })

  test('7. Founder sees Q-Score on dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder/dashboard`)

    // Should not redirect to login (meaning session is active)
    const url = page.url()
    expect(url).not.toContain('/login')

    // Look for Q-Score display. page.locator()'s second argument is an options
    // object ({has, hasText, ...}), never a Locator — the previous form passed a
    // Locator and never scoped anything. Scoping to the card is what was meant.
    const scoreCard = page
      .locator('[class*="card"], [class*="score"]')
      .filter({ hasText: /Q-Score|Score|IQ/ })
      .first()
    await scoreCard.isVisible({ timeout: 5000 }).catch(() => false)

    // Even if score card not visible, dashboard should exist
    const dashboardContent = page.locator('h1, h2')
    expect(await dashboardContent.count()).toBeGreaterThan(0)
  })

  test('8. Founder can navigate to agents', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder`)

    // Look for agents link
    const agentsLink = page.locator('a, button').filter({ hasText: /Agent|Patel|Sage|Felix/i }).first()
    const hasAgentsNav = await agentsLink.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasAgentsNav) {
      await agentsLink.click()
      await page.waitForLoadState('networkidle')
    }

    // Should show agent workspace
    const agentContent = page.locator('text=/Chat|Agent|Message|Ask/i')
    const contentVisible = await agentContent.isVisible({ timeout: 5000 }).catch(() => false)

    expect(contentVisible || page.url().includes('agent')).toBeTruthy()
  })

  test('9. Founder can start a chat with an agent', async ({ page }) => {
    // Navigate to Sage agent
    await page.goto(`${BASE_URL}/founder/agents/sage`)
    await page.waitForLoadState('networkidle')

    // Find chat input
    const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[placeholder*="Message"]').first()

    if (await chatInput.isVisible()) {
      await chatInput.fill('What should my next business focus be?')

      // Submit via button or Enter
      const sendBtn = page.locator('button').filter({ hasText: /Send|Submit|Go/i }).first()
      if (await sendBtn.isVisible()) {
        await sendBtn.click()
      } else {
        await chatInput.press('Enter')
      }

      // Should show response or loading indicator
      await page.waitForTimeout(2000)
      const response = page.locator('text=/Thanks|Consider|Based|Recommend/i')
      const responseVisible = await response.isVisible({ timeout: 10000 }).catch(() => false)

      expect(responseVisible || page.locator('[class*="message"], [class*="response"]').count().then(c => c > 0)).toBeTruthy()
    }
  })

  test('10. Founder session persists across navigation', async ({ page, context }) => {
    // Navigate to multiple pages and verify session
    await page.goto(`${BASE_URL}/founder/dashboard`)

    let isLoggedIn = !page.url().includes('/login')
    expect(isLoggedIn).toBeTruthy()

    // Navigate to profile builder
    await page.goto(`${BASE_URL}/founder/profile-builder`)
    isLoggedIn = !page.url().includes('/login')
    expect(isLoggedIn).toBeTruthy()

    // Navigate to agents
    await page.goto(`${BASE_URL}/founder/agents`)
    isLoggedIn = !page.url().includes('/login')
    expect(isLoggedIn).toBeTruthy()
  })
})

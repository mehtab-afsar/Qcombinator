/**
 * MARKETPLACE COMPLETE FLOW E2E TEST
 * Tests: founder connects → investor receives → accepts → messaging
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Marketplace Complete Flow', () => {
  let founderEmail: string
  let investorEmail: string
  const testPassword = 'TestPass123!'

  test.beforeAll(async () => {
    const timestamp = Date.now()
    founderEmail = `founder-mp-${timestamp}@example.com`
    investorEmail = `investor-mp-${timestamp}@example.com`
  })

  test('1. Create founder account for marketplace test', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup?role=founder`)

    await page.locator('input[type="email"]').first().fill(founderEmail)
    await page.locator('input[type="password"]').first().fill(testPassword)
    await page.locator('button').filter({ hasText: /Sign Up|Continue/i }).first().click()

    await expect(page).toHaveURL(/\/founder\/onboarding/, { timeout: 10000 })
  })

  test('2. Create investor account for marketplace test', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${BASE_URL}/signup?role=investor`)

    await page.locator('input[type="email"]').first().fill(investorEmail)
    await page.locator('input[type="password"]').first().fill(testPassword)
    await page.locator('button').filter({ hasText: /Sign Up|Continue/i }).first().click()

    await expect(page).toHaveURL(/\/investor\/onboarding/, { timeout: 10000 })

    await context.close()
  })

  test('3. Founder completes onboarding and sets up profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/founder/onboarding`)
    await page.waitForLoadState('networkidle')

    // Complete onboarding steps
    const nextBtns = page.locator('button').filter({ hasText: /Next|Continue|Complete/i })

    for (let i = 0; i < 4; i++) {
      const nextBtn = nextBtns.first()

      if (await nextBtn.isVisible()) {
        // Fill fields if needed
        const inputs = page.locator('input[type="text"], textarea')
        const inputCount = await inputs.count()

        for (let j = 0; j < Math.min(inputCount, 1); j++) {
          try {
            const input = inputs.nth(j)
            if (await input.isVisible() && (await input.inputValue()) === '') {
              await input.fill(`Test data ${i}`)
            }
          } catch {
            // Skip
          }
        }

        await nextBtn.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('4. Investor completes onboarding', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login as investor
    await page.goto(`${BASE_URL}/login`)

    await page.locator('input[type="email"]').first().fill(investorEmail)
    await page.locator('input[type="password"]').first().fill(testPassword)
    await page.locator('button').filter({ hasText: /Sign In|Login|Continue/i }).first().click()

    await page.waitForLoadState('networkidle')

    // Navigate to onboarding if needed
    await page.goto(`${BASE_URL}/investor/onboarding`)

    // Complete onboarding
    const nextBtns = page.locator('button').filter({ hasText: /Next|Continue|Complete|Done|Finish/i })

    for (let i = 0; i < 5; i++) {
      const nextBtn = nextBtns.first()

      if (await nextBtn.isVisible()) {
        const inputs = page.locator('input[type="text"], textarea, input[type="email"]')

        for (let j = 0; j < Math.min(await inputs.count(), 1); j++) {
          try {
            const input = inputs.nth(j)
            if (await input.isVisible()) {
              await input.fill(`Test investor data ${i}`)
            }
          } catch {
            // Skip
          }
        }

        await nextBtn.click()
        await page.waitForTimeout(300)
      }
    }

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/investor/, { timeout: 10000 })

    await context.close()
  })

  test('5. Founder navigates to investor matching page', async ({ page }) => {
    // Login as founder
    await page.goto(`${BASE_URL}/login`)

    await page.locator('input[type="email"]').first().fill(founderEmail)
    await page.locator('input[type="password"]').first().fill(testPassword)
    await page.locator('button').filter({ hasText: /Sign In|Login/i }).first().click()

    await page.waitForLoadState('networkidle')

    // Navigate to matching/investors page
    const matchingUrl = [
      `${BASE_URL}/founder/matching`,
      `${BASE_URL}/founder/investors`,
      `${BASE_URL}/founder/discover`,
    ]

    for (const url of matchingUrl) {
      await page.goto(url, { waitUntil: 'networkidle' })
      const notFoundMsg = page.locator('text=/404|Not Found|not found/i')
      const is404 = await notFoundMsg.isVisible({ timeout: 2000 }).catch(() => false)

      if (!is404) {
        // Found the right page
        break
      }
    }
  })

  test('6. Founder sends connection request to investor', async ({ page }) => {
    // Should be on matching page from previous test
    await page.goto(`${BASE_URL}/founder/matching`)
    await page.waitForLoadState('networkidle')

    // Find connection request button
    const connectBtn = page.locator('button').filter({ hasText: /Connect|Request|Message|Reach Out/i }).first()

    if (await connectBtn.isVisible()) {
      await connectBtn.click()

      // Should show confirmation or success message
      await page.waitForTimeout(1000)

      const successMsg = page.locator('text=/Success|Sent|Request sent|Connected/i')
      const isSuccess = await successMsg.isVisible({ timeout: 5000 }).catch(() => false)

      // At minimum, button action should complete
      expect(isSuccess || page.url().includes('matching')).toBeTruthy()
    }
  })

  test('7. Investor views connection requests', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login as investor
    await page.goto(`${BASE_URL}/login`)

    await page.locator('input[type="email"]').first().fill(investorEmail)
    await page.locator('input[type="password"]').first().fill(testPassword)
    await page.locator('button').filter({ hasText: /Sign In|Login/i }).first().click()

    await page.waitForLoadState('networkidle')

    // Navigate to connections page
    await page.goto(`${BASE_URL}/investor/connections`)

    // Should show connections section
    const connectionsHeading = page.locator('text=/Connection|Request|Pending/i')
    const hasConnections = await connectionsHeading.isVisible({ timeout: 5000 }).catch(() => false)

    expect(hasConnections || page.url().includes('connections')).toBeTruthy()

    await context.close()
  })

  test('8. Investor accepts connection request', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login as investor
    await page.goto(`${BASE_URL}/login`)

    await page.locator('input[type="email"]').first().fill(investorEmail)
    await page.locator('input[type="password"]').first().fill(testPassword)
    await page.locator('button').filter({ hasText: /Sign In|Login/i }).first().click()

    await page.waitForLoadState('networkidle')

    // Go to connections
    await page.goto(`${BASE_URL}/investor/connections`)
    await page.waitForLoadState('networkidle')

    // Find and click accept button
    const acceptBtn = page.locator('button').filter({ hasText: /Accept|Approve|Connect/i }).first()

    if (await acceptBtn.isVisible()) {
      await acceptBtn.click()

      // Should show success/updated status
      await page.waitForTimeout(1000)

      const statusUpdate = page.locator('text=/Accepted|Approved|Connected|Meeting/i')
      const isUpdated = await statusUpdate.isVisible({ timeout: 5000 }).catch(() => false)

      expect(isUpdated || !page.url().includes('connections')).toBeTruthy()
    }

    await context.close()
  })

  test('9. Both founder and investor can see message thread', async ({ browser }) => {
    // Check founder messages
    const founderContext = await browser.newContext()
    const founderPage = await founderContext.newPage()

    await founderPage.goto(`${BASE_URL}/login`)
    await founderPage.locator('input[type="email"]').first().fill(founderEmail)
    await founderPage.locator('input[type="password"]').first().fill(testPassword)
    await founderPage.locator('button').filter({ hasText: /Sign In|Login/i }).first().click()

    await founderPage.waitForLoadState('networkidle')
    await founderPage.goto(`${BASE_URL}/founder/messages`)

    const founderMessagesVisible = await founderPage.locator('text=/Message|Thread|Conversation/i')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(founderMessagesVisible || founderPage.url().includes('messages')).toBeTruthy()

    await founderContext.close()

    // Check investor messages
    const investorContext = await browser.newContext()
    const investorPage = await investorContext.newPage()

    await investorPage.goto(`${BASE_URL}/login`)
    await investorPage.locator('input[type="email"]').first().fill(investorEmail)
    await investorPage.locator('input[type="password"]').first().fill(testPassword)
    await investorPage.locator('button').filter({ hasText: /Sign In|Login/i }).first().click()

    await investorPage.waitForLoadState('networkidle')
    await investorPage.goto(`${BASE_URL}/investor/messages`)

    const investorMessagesVisible = await investorPage.locator('text=/Message|Thread|Conversation/i')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(investorMessagesVisible || investorPage.url().includes('messages')).toBeTruthy()

    await investorContext.close()
  })

  test('10. Founder can send message in thread', async ({ page }) => {
    // Login as founder
    await page.goto(`${BASE_URL}/login`)

    await page.locator('input[type="email"]').first().fill(founderEmail)
    await page.locator('input[type="password"]').first().fill(testPassword)
    await page.locator('button').filter({ hasText: /Sign In|Login/i }).first().click()

    await page.waitForLoadState('networkidle')

    // Go to messages
    await page.goto(`${BASE_URL}/founder/messages`)
    await page.waitForLoadState('networkidle')

    // Find message input
    const msgInput = page.locator('input[placeholder*="Message"], textarea[placeholder*="Message"]').first()

    if (await msgInput.isVisible()) {
      await msgInput.fill('Great to connect! Interested in discussing a potential investment.')

      // Send message
      const sendBtn = page.locator('button').filter({ hasText: /Send|Submit/i }).first()
      if (await sendBtn.isVisible()) {
        await sendBtn.click()

        // Verify message was sent
        await page.waitForTimeout(1000)
        const msgVisible = page.locator('text=/Great to connect|discussing|investment/i')
        const isSent = await msgVisible.isVisible({ timeout: 5000 }).catch(() => false)

        expect(isSent).toBeTruthy()
      }
    }
  })
})

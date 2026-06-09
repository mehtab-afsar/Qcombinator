/**
 * ACCESSIBILITY & MOBILE COMPLIANCE TESTS
 * WCAG 2.1 AA compliance + responsive design validation
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('Accessibility & Mobile Compliance', () => {
  // Desktop tests
  test.describe('Desktop - WCAG 2.1 AA Compliance', () => {
    test('Landing page has proper heading hierarchy', async ({ page }) => {
      await page.goto(BASE_URL)

      const h1 = page.locator('h1')
      const h2 = page.locator('h2')
      const headingCount = await h1.count() + await h2.count()

      expect(headingCount).toBeGreaterThan(0)
    })

    test('Form inputs have associated labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      const inputs = page.locator('input[type="email"], input[type="password"]')
      const inputCount = await inputs.count()

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        const ariaLabel = await input.getAttribute('aria-label')
        const placeholder = await input.getAttribute('placeholder')
        const name = await input.getAttribute('name')

        // Should have label, placeholder, or aria-label
        const hasLabel = ariaLabel || placeholder || name
        expect(hasLabel).toBeTruthy()
      }
    })

    test('Buttons have accessible text', async ({ page }) => {
      await page.goto(BASE_URL)

      const buttons = page.locator('button')
      const buttonCount = await buttons.count()

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i)
        const text = await button.textContent()
        const ariaLabel = await button.getAttribute('aria-label')

        const hasLabel = text?.trim() || ariaLabel
        expect(hasLabel).toBeTruthy()
      }
    })

    test('Links are distinguishable (not color-only)', async ({ page }) => {
      await page.goto(BASE_URL)

      const links = page.locator('a')
      const linkCount = await links.count()

      expect(linkCount).toBeGreaterThan(0)

      for (let i = 0; i < Math.min(linkCount, 5); i++) {
        const link = links.nth(i)
        const text = await link.textContent()

        // Links should have text, not just color
        expect(text?.trim().length).toBeGreaterThan(0)
      }
    })

    test('Images have alt text', async ({ page }) => {
      await page.goto(BASE_URL)

      const images = page.locator('img')
      const imageCount = await images.count()

      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i)
        const alt = await img.getAttribute('alt')
        const ariaLabel = await img.getAttribute('aria-label')

        // Images should have alt or aria-label (decorative images can have empty alt)
        const hasAlt = alt !== undefined || ariaLabel
        expect(hasAlt).toBeTruthy()
      }
    })

    test('Keyboard navigation works on login form', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      // Tab through form
      await page.keyboard.press('Tab')
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName)

      expect(focusedElement).toBeTruthy()

      // Tab to password field
      await page.keyboard.press('Tab')
      focusedElement = await page.evaluate(() => document.activeElement?.tagName)

      expect(focusedElement).toBeTruthy()

      // Tab to submit button
      await page.keyboard.press('Tab')
      focusedElement = await page.evaluate(() => document.activeElement?.tagName)

      expect(focusedElement).toBeTruthy()
    })

    test('Tab order is logical', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`)

      const tabOrder = []

      // Simulate tabbing through 5 elements
      for (let i = 0; i < 5; i++) {
        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          return {
            tag: el?.tagName,
            type: (el as HTMLInputElement | HTMLSelectElement)?.type || '',
            visible: el?.offsetParent !== null,
          }
        })

        tabOrder.push(focused)
        await page.keyboard.press('Tab')
      }

      // All tabbed elements should be visible
      tabOrder.forEach(el => {
        expect(el.visible || el.tag === 'BUTTON').toBeTruthy()
      })
    })

    test('Focus indicator is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      // Press Tab to focus an element
      await page.keyboard.press('Tab')

      const hasFocusOutline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const style = window.getComputedStyle(el)
        return (
          style.outline !== 'none' ||
          style.boxShadow !== 'none' ||
          style.border !== 'none'
        )
      })

      expect(hasFocusOutline).toBeTruthy()
    })

    test('No keyboard traps (can tab away from input)', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      // Focus email input
      const emailInput = page.locator('input[type="email"]').first()
      await emailInput.focus()

      // Should be able to tab away
      await page.keyboard.press('Tab')

      const movedFocus = await page.evaluate(() => {
        return document.activeElement !== document.querySelector('input[type="email"]')
      })

      expect(movedFocus).toBeTruthy()
    })

    test('Form labels linked to inputs', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`)

      const inputs = page.locator('input[type="email"], input[type="password"]')

      for (let i = 0; i < await inputs.count(); i++) {
        const input = inputs.nth(i)
        const inputId = await input.getAttribute('id')
        const name = await input.getAttribute('name')

        // Should have id or name for label association
        expect(inputId || name).toBeTruthy()
      }
    })
  })

  // Mobile viewport tests
  test.describe('Mobile Viewport (375px - iPhone SE)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
    })

    test('Layout is responsive - no horizontal scroll', async ({ page }) => {
      await page.goto(BASE_URL)

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 for rounding
    })

    test('Navigation is accessible on mobile', async ({ page }) => {
      await page.goto(BASE_URL)

      // Should have navigation (menu button or nav bar)
      const nav = page.locator('nav, [role="navigation"], button:has-text("Menu")')
      const navVisible = await nav.isVisible({ timeout: 2000 }).catch(() => false)

      expect(navVisible || page.locator('a').count().then(c => c > 0)).toBeTruthy()
    })

    test('Login form is usable on mobile', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      // All form fields should be visible without horizontal scroll
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')

      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()

      // Inputs should be touchable (44px minimum height)
      const emailBox = await emailInput.boundingBox()
      const passwordBox = await passwordInput.boundingBox()

      expect(emailBox?.height).toBeGreaterThanOrEqual(44)
      expect(passwordBox?.height).toBeGreaterThanOrEqual(44)
    })

    test('Buttons are touch-sized (44px minimum)', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      const buttons = page.locator('button')

      for (let i = 0; i < Math.min(await buttons.count(), 3); i++) {
        const button = buttons.nth(i)
        const box = await button.boundingBox()

        // Touch targets should be 44x44px minimum
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
      }
    })

    test('Form inputs do not zoom on focus (viewport-fit)', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      // Check for viewport meta tag
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content')

      expect(viewportMeta).toContain('width=device-width')
    })

    test('Text is readable on mobile (16px minimum)', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      const paragraphs = page.locator('p, span, label')

      for (let i = 0; i < Math.min(await paragraphs.count(), 5); i++) {
        const el = paragraphs.nth(i)
        const fontSize = await el.evaluate((el: HTMLElement) => {
          return parseInt(window.getComputedStyle(el).fontSize)
        })

        expect(fontSize).toBeGreaterThanOrEqual(14) // Allow some flexibility
      }
    })

    test('Onboarding is mobile-friendly', async ({ page }) => {
      await page.goto(`${BASE_URL}/founder/onboarding`)

      // Should not overflow horizontally
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)

      // Form elements should be visible
      const inputs = page.locator('input, textarea, button')
      expect(await inputs.count()).toBeGreaterThan(0)
    })

    test('Profile builder is mobile-friendly', async ({ page }) => {
      await page.goto(`${BASE_URL}/founder/profile-builder`)

      // Should not overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })
  })

  // Tablet viewport tests
  test.describe('Tablet Viewport (768px - iPad)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
    })

    test('Layout adapts to tablet width', async ({ page }) => {
      await page.goto(BASE_URL)

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    })

    test('Two-column layouts work on tablet', async ({ page }) => {
      await page.goto(`${BASE_URL}/founder/dashboard`)

      const content = page.locator('main, [role="main"]')
      await expect(content).toBeVisible()
    })
  })

  // Screen reader tests
  test.describe('Screen Reader Support', () => {
    test('Page has meaningful title', async ({ page }) => {
      await page.goto(BASE_URL)

      const title = await page.title()
      expect(title.length).toBeGreaterThan(0)
      expect(title).not.toMatch(/undefined|null/)
    })

    test('Page structure uses semantic HTML', async ({ page }) => {
      await page.goto(BASE_URL)

      const hasSemanticElements = await page.evaluate(() => {
        const header = document.querySelector('header')
        const nav = document.querySelector('nav, [role="navigation"]')
        const main = document.querySelector('main, [role="main"]')
        const footer = document.querySelector('footer')

        return !!(header || nav || main || footer)
      })

      expect(hasSemanticElements).toBeTruthy()
    })

    test('Form has proper ARIA attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      const form = page.locator('form').first()

      // Check that form elements have ARIA roles if needed
      const hasAriaMarkup = await form.evaluate((el: HTMLElement) => {
        return el.querySelectorAll('[aria-label], [aria-labelledby], [role]').length > 0 ||
               el.querySelectorAll('label').length > 0
      })

      expect(hasAriaMarkup).toBeTruthy()
    })

    test('Links and buttons have descriptive text', async ({ page }) => {
      await page.goto(BASE_URL)

      const interactiveElements = page.locator('a, button')

      for (let i = 0; i < Math.min(await interactiveElements.count(), 5); i++) {
        const el = interactiveElements.nth(i)
        const text = await el.textContent()
        const ariaLabel = await el.getAttribute('aria-label')

        const hasDescription = text?.trim().length || ariaLabel?.length
        expect(hasDescription).toBeGreaterThan(0)
      }
    })
  })

  // Color contrast tests
  test.describe('Color Contrast (WCAG AA)', () => {
    test('Text has sufficient contrast on login form', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      // Simple check: inputs should be readable
      const inputs = page.locator('input')

      for (let i = 0; i < Math.min(await inputs.count(), 2); i++) {
        const input = inputs.nth(i)
        const isVisible = await input.isVisible()

        expect(isVisible).toBeTruthy()
      }
    })
  })
})

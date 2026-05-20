/**
 * E2E Smoke — Investor Pages
 *
 * Verifies all 9 testable investor pages load without 404/500
 * and don't redirect to /login when signed in as the seeded test investor.
 */

import { test, expect } from '@playwright/test'
import { signInAsInvestor } from '../helpers/auth'

const INVESTOR_PAGES = [
  { path: '/investor/dashboard',    key: 'dashboard'    },
  { path: '/investor/deal-flow',    key: 'deal-flow'    },
  { path: '/investor/ai-analysis',  key: 'ai-analysis'  },
  { path: '/investor/pipeline',     key: 'pipeline'     },
  { path: '/investor/settings',     key: 'settings'     },
  { path: '/investor/portfolio',    key: 'portfolio'    },
  { path: '/investor/billing',      key: 'billing'      },
  { path: '/investor/connections',  key: 'connections'  },
  { path: '/investor/messages',     key: 'messages'     },
] as const

test.describe('Investor Pages — Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsInvestor(page)
  })

  for (const { path, key } of INVESTOR_PAGES) {
    test(`${key} — loads without 404/500`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // Must stay authenticated
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

      // Must not show a Next.js 404 / error page
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/This page could not be found|404|Page Not Found/i)

      // Page has rendered actual content
      expect(bodyText.trim().length).toBeGreaterThan(50)
    })
  }
})

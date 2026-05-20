/**
 * E2E Smoke — Founder Pages
 *
 * Verifies all 14 testable founder pages load without 404/500
 * and don't redirect to /login when signed in as the seeded test founder.
 *
 * These are smoke tests — they check the page loads and has content,
 * not that every feature works. Feature tests are in separate spec files.
 */

import { test, expect } from '@playwright/test'
import { signInAsFounder } from '../helpers/auth'

const FOUNDER_PAGES = [
  { path: '/founder/dashboard',       key: 'dashboard'       },
  { path: '/founder/improve-qscore',  key: 'improve-qscore'  },
  { path: '/founder/pitch-analyzer',  key: 'pitch-analyzer'  },
  { path: '/founder/pitch-deck',      key: 'pitch-deck'      },
  { path: '/founder/metrics',         key: 'metrics'         },
  { path: '/founder/workspace',       key: 'workspace'       },
  { path: '/founder/portfolio',       key: 'portfolio'       },
  { path: '/founder/messages',        key: 'messages'        },
  { path: '/founder/matching',        key: 'matching'        },
  { path: '/founder/settings',        key: 'settings'        },
  { path: '/founder/activity',        key: 'activity'        },
  { path: '/founder/library',         key: 'library'         },
  { path: '/founder/cxo',             key: 'cxo-hub'         },
  { path: '/founder/profile',         key: 'profile'         },
] as const

test.describe('Founder Pages — Smoke Tests', () => {
  // Sign in once before each test (sequential worker, no parallelism)
  test.beforeEach(async ({ page }) => {
    await signInAsFounder(page)
  })

  for (const { path, key } of FOUNDER_PAGES) {
    test(`${key} — loads without 404/500`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // Must stay authenticated — not redirected to login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

      // Must not show a Next.js 404 / error page
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/This page could not be found|404|Page Not Found/i)

      // Page has rendered some actual content
      expect(bodyText.trim().length).toBeGreaterThan(50)
    })
  }
})

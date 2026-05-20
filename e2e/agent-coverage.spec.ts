/**
 * E2E — Agent Workspace Coverage
 *
 * Smoke-tests all 8 untested AI agents (Patel is covered by founder-flow.spec.ts).
 * Each agent test verifies:
 *   1. URL stays on /founder/cxo/<agentId> (not redirected away)
 *   2. Chat textarea is visible (the workspace rendered)
 *   3. Agent name appears somewhere on the page
 *   4. No 404 text visible
 *
 * Uses test.describe.configure({ mode: 'serial' }) + test.beforeAll to reduce
 * sign-in overhead (one sign-in per agent group instead of one per test).
 */

import { test, expect, Page } from '@playwright/test'
import { signInAsFounder } from './helpers/auth'

const AGENTS = [
  { id: 'nova',   name: 'Nova'   },
  { id: 'atlas',  name: 'Atlas'  },
  { id: 'felix',  name: 'Felix'  },
  { id: 'harper', name: 'Harper' },
  { id: 'susi',   name: 'Susi'   },
  { id: 'leo',    name: 'Leo'    },
  { id: 'maya',   name: 'Maya'   },
  { id: 'sage',   name: 'Sage'   },
] as const

for (const agent of AGENTS) {
  test.describe(`Agent: ${agent.name} (${agent.id})`, () => {
    test.describe.configure({ mode: 'serial' })

    let sharedPage: Page

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext()
      sharedPage = await context.newPage()
      await signInAsFounder(sharedPage)
    })

    test.afterAll(async () => {
      await sharedPage.context().close()
    })

    test(`${agent.name} workspace loads without redirect`, async () => {
      await sharedPage.goto(`/founder/cxo/${agent.id}`)
      await sharedPage.waitForLoadState('networkidle')

      // Must stay on the agent page — not redirected to /founder/cxo (hub) or /login
      await expect(sharedPage).toHaveURL(new RegExp(`/founder/cxo/${agent.id}`), { timeout: 15_000 })
      await expect(sharedPage).not.toHaveURL(/\/login/)
    })

    test(`${agent.name} chat textarea is visible`, async () => {
      await sharedPage.goto(`/founder/cxo/${agent.id}`)
      await sharedPage.waitForLoadState('networkidle')

      // CXOWorkspace renders a textarea for chat input
      const textarea = sharedPage.locator('textarea').first()
      await expect(textarea).toBeVisible({ timeout: 20_000 })
    })

    test(`${agent.name} name is visible on the page`, async () => {
      await sharedPage.goto(`/founder/cxo/${agent.id}`)
      await sharedPage.waitForLoadState('networkidle')

      // Agent name should appear in the workspace header or sidebar
      const nameLabel = sharedPage.locator(`text=/${agent.name}/i`).first()
      await expect(nameLabel).toBeVisible({ timeout: 20_000 })
    })

    test(`${agent.name} page has no 404 error`, async () => {
      await sharedPage.goto(`/founder/cxo/${agent.id}`)
      await sharedPage.waitForLoadState('networkidle')

      await expect(
        sharedPage.locator('text=/404|This page could not be found|Not Found/i').first()
      ).toHaveCount(0)
    })
  })
}

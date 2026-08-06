import { test, expect } from '@playwright/test'
import { signInWithCredentials } from '../helpers/auth'

/**
 * Live proof for the Q Score Dashboard + Executive Team IA restructuring built this session.
 * Runs against the real local account mehtabafsar346@gmail.com (same one used for the Founder
 * Experience spine's live proof) — it already has a confirmed mandate and real Growth/P001
 * data, which this needs to prove the active-vs-idle tab states honestly, not against a fresh
 * account with nothing to show. Same temporary-password mechanism as before (direct DB write,
 * bypassing the local GoTrue admin-key issue), reverted after this run.
 */

test.describe.configure({ mode: 'serial' })

const email = 'mehtabafsar346@gmail.com'
const password = 'SpineTest_Temp_9f2c!'

/** Dismisses the pre-existing WelcomeModal tour if it happens to appear — unrelated to this
 *  IA restructuring, but its full-screen backdrop blocks every click underneath it. */
async function dismissWelcomeModalIfPresent(page: import('@playwright/test').Page): Promise<void> {
  const skip = page.getByText('Skip intro')
  if (await skip.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skip.click()
  }
}

test('sidebar shows the new IA — Q Score Dashboard, Executive Team, no separate Profile Builder entry', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/dashboard')

  const nav = page.locator('nav, aside').first()
  await expect(page.getByRole('link', { name: 'Q Score Dashboard' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('link', { name: 'Executive Team' })).toBeVisible()
  // Profile Builder must be gone from the main sidebar — it's only reachable via the Q Score
  // Dashboard's own sub-tabs now.
  await expect(nav.getByRole('link', { name: 'Profile Builder', exact: true })).toHaveCount(0)
})

test('Q Score Dashboard sub-tabs: Overview, Improve my score, Profile Builder', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/dashboard')

  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('tab', { name: 'Improve my score' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Profile Builder' })).toBeVisible()
  await dismissWelcomeModalIfPresent(page)

  // Clicking through to Improve my score keeps the tab strip and the app shell (sidebar) —
  // unlike Profile Builder, this route is NOT a full-screen takeover.
  await page.getByRole('tab', { name: 'Improve my score' }).click()
  await page.waitForURL(/\/founder\/improve-qscore/)
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()

  // Profile Builder navigates into its own deliberately full-screen flow — the tab strip
  // (and the whole app shell) should NOT persist inside it.
  await page.getByRole('tab', { name: 'Profile Builder' }).click()
  await page.waitForURL(/\/founder\/profile-builder/)
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveCount(0)
})

test('Executive Team shows all 5 tabs, always — not just the active one', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')

  for (const label of ['CEO', 'CGO', 'CTO', 'COO', 'CFO']) {
    await expect(page.getByRole('tab', { name: label })).toBeVisible()
  }
})

test('a genuinely idle executive tab (Operations — no mandate line at all) shows an honest empty state', async ({ page }) => {
  // Discovered live: this real account's real S002-generated contract gives Finance, Growth
  // AND Product a mandate line — only Operations has none. "Idle" isn't one uniform state:
  // Finance has a Mandate but no Executive (no registered Program); Operations has neither.
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  await page.getByRole('tab', { name: 'COO' }).click()
  await page.waitForURL(/\/founder\/executive\/operations/)

  await expect(page.getByText('The Mandate')).toBeVisible()
  await expect(page.getByText('No active program yet')).toBeVisible()
  // Confirm status still shows even for an idle executive — the WHOLE contract is confirmed
  // even when this executive's own slice is empty.
  await expect(page.getByText(/Confirmed as part of your mandate/)).toBeVisible()
  // No approve/confirm BUTTON anywhere on this tab — read-only status line only (ADR-002).
  await expect(page.getByRole('button', { name: /^confirm/i })).toHaveCount(0)
})

test('an executive with a real Mandate but no registered Program (Finance) shows the mandate text honestly, without inventing Executive-beat panels', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  await page.getByRole('tab', { name: 'CFO' }).click()
  await page.waitForURL(/\/founder\/executive\/finance/)

  await expect(page.getByText('The Mandate')).toBeVisible()
  await expect(page.getByText(/financial model/i)).toBeVisible() // the real responsibility text
  // No "The Executive" beat — Finance has a mandate line but no registered Program, so there
  // is genuinely nothing to run yet. Not shown, not faked.
  await expect(page.getByText('The Executive')).toHaveCount(0)
  await expect(page.getByText(/Confirmed as part of your mandate/)).toBeVisible()
})

test('the active executive tab (Growth) shows a real mandate and real work, plus the read-only Confirm line', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')
  await dismissWelcomeModalIfPresent(page)

  await page.getByRole('tab', { name: 'CGO' }).click()
  await page.waitForURL(/\/founder\/executive\/growth/)

  await expect(page.getByText('The Mandate')).toBeVisible()
  await expect(page.getByText('The Executive')).toBeVisible()
  await expect(page.getByText(/Confirmed as part of your mandate/)).toBeVisible()
  // Not the idle copy — Growth has real work.
  await expect(page.getByText('No active program yet')).toHaveCount(0)
})

test('the CEO tab is unchanged — still the real mandate flow, reachable from the tab bar', async ({ page }) => {
  await signInWithCredentials(page, email, password, /\/founder/)
  await page.goto('/founder/executive')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('tab', { name: 'CEO' })).toBeVisible()
  // Already on the CEO tab (root route) — Command View content should be present for a
  // confirmed account: the compact mandate line AND the documents panel, both at once.
  await expect(page.getByText(/^Epoch \d/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Your documents')).toBeVisible()
})

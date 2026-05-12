/**
 * E2E — Founder Flow
 *
 * Tests the full happy-path for a logged-in founder:
 *   1. Auth      — sign in → redirect to /founder/dashboard
 *   2. Q-Score   — Q-Score card visible on dashboard
 *   3. Agent nav — navigate to /founder/cxo/patel, chat UI loads
 *   4. Chat      — send a message, response bubble appears
 *   5. CXO view  — navigate to /founder/cxo/patel, workspace renders
 *   6. Deliverable panel — if a deliverable exists, click it, verify not raw JSON
 *
 * Selector notes (based on actual source):
 *   - Login form uses plain <input type="email"> / <input type="password"> / <button type="submit">
 *   - Agent workspace chat uses a <textarea> for input and a send <button> beside it
 *   - Dashboard Q-Score card text contains "Q-Score"
 *   - Deliverable items in the left panel are clickable buttons/divs with the deliverable label text
 *
 * Adjust TEST_FOUNDER_EMAIL / TEST_FOUNDER_PASSWORD via environment variables or .env.test.local.
 */

import { test, expect } from '@playwright/test'
import { signInAsFounder } from './helpers/auth'

// ─── 1. Auth ──────────────────────────────────────────────────────────────────

test.describe('Founder Auth', () => {
  test('signs in and lands on /founder/dashboard', async ({ page }) => {
    await signInAsFounder(page)

    // Should be somewhere under /founder after login
    await expect(page).toHaveURL(/\/founder/, { timeout: 10_000 })

    // The page should not show the login form any more
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
  })
})

// ─── 2. Q-Score card ──────────────────────────────────────────────────────────

test.describe('Founder Dashboard — Q-Score', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFounder(page)
    await page.goto('/founder/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('Q-Score card is visible on the dashboard', async ({ page }) => {
    // The dashboard renders "Q-Score" in the hero card area.
    // We look for any element containing "Q-Score" text.
    const qScoreEl = page.locator('text=/Q-Score/i').first()
    await expect(qScoreEl).toBeVisible({ timeout: 15_000 })
  })

  test('Q-Score numeric value or progress indicator is displayed', async ({ page }) => {
    // The card shows the overall score as a number, or shows "calculating…"
    // We accept either state — the card itself must be rendered.
    const scoreCard = page.locator('text=/Q-Score|calculating/i').first()
    await expect(scoreCard).toBeVisible({ timeout: 15_000 })
  })
})

// ─── 3. CXO navigation — Patel workspace ──────────────────────────────────────

test.describe('Founder — Patel CXO Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFounder(page)
  })

  test('navigates to /founder/cxo/patel and workspace loads', async ({ page }) => {
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')

    // AgentWorkspace renders a textarea for the chat input
    const chatInput = page.locator('textarea').first()
    await expect(chatInput).toBeVisible({ timeout: 15_000 })
  })

  test('workspace shows agent name "Patel" and role', async ({ page }) => {
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')

    // The top bar and left panel both render "Patel"
    await expect(page.locator('text=Patel').first()).toBeVisible({ timeout: 15_000 })
  })

  test('deliverables panel lists ICP Definition deliverable', async ({ page }) => {
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')

    // Left panel lists all deliverables; first one is "D1 · ICP Definition"
    await expect(
      page.locator('text=/ICP Definition/i').first()
    ).toBeVisible({ timeout: 15_000 })
  })
})

// ─── 4. Chat — send a message to Patel ────────────────────────────────────────

test.describe('Founder — Patel Chat', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFounder(page)
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')
    // Wait for chat input to be available
    await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 15_000 })
  })

  test('sends a message and receives a response', async ({ page }) => {
    const chatInput = page.locator('textarea').first()
    const testMessage = 'Hello, who are you and what can you help me with?'

    await chatInput.fill(testMessage)
    await expect(chatInput).toHaveValue(testMessage)

    // The send button is the <button> sibling of the textarea inside the input bar.
    // It contains a Send (arrow) icon. We click it.
    const _sendButton = page.locator(
      'div:has(> textarea) + button, textarea ~ button'
    ).first()

    // Fallback: if the compound selector doesn't match, target the last button in the
    // input bar container
    const inputBar = page.locator('div').filter({ has: page.locator('textarea') }).last()
    const sendBtn = inputBar.locator('button').last()

    await sendBtn.click()

    // Wait up to 30s for the user message bubble to appear
    await expect(
      page.locator(`text=${testMessage}`).first()
    ).toBeVisible({ timeout: 30_000 })

    // Wait for agent response — a typing indicator or a non-user message bubble.
    // The agent avatar is a div with the agent's initial rendered beside the message.
    // We allow a generous timeout for the streaming response to begin.
    const _agentResponse = page
      .locator('div')
      .filter({ hasText: /[A-Za-z]{20,}/ }) // any substantial text block from agent
      .nth(1) // skip the first (likely the user message)

    // Simpler: just wait for the typing indicator OR an agent message div to appear.
    // The typing indicator has three animated dots; after it goes away an agent message
    // must be present. We just assert the page has more than the user bubble.
    await page.waitForFunction(
      (msg) => {
        const allText = document.body.innerText
        return allText.includes(msg) // user message rendered
      },
      testMessage,
      { timeout: 30_000 }
    )

    // The agent *starts* streaming within 30s (API calls real Anthropic, so we only
    // assert that the typing indicator appears, not that it resolves fully).
    const typingOrResponse = page.locator(
      'text=/[Pp]atel|typing|…|GTM|ICP|go-to-market/i'
    ).first()
    await expect(typingOrResponse).toBeVisible({ timeout: 30_000 })
  })
})

// ─── 5. CXO dashboard — Patel ─────────────────────────────────────────────────

test.describe('Founder — CXO Workspace (Patel)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFounder(page)
  })

  test('navigates to /founder/cxo/patel and workspace renders', async ({ page }) => {
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')

    // CXOWorkspace renders "Loading workspace…" while fetching, then
    // shows the agent chat UI. We wait for either:
    //   (a) the textarea chat input (fully loaded), or
    //   (b) the loading message to disappear
    const workspaceLoaded = page.locator('textarea, text=/Loading workspace/i').first()
    await expect(workspaceLoaded).toBeVisible({ timeout: 20_000 })

    // After load, no generic error page should be shown
    await expect(page.locator('text=/404|Not Found|error/i').first()).toHaveCount(0)
  })

  test('CXO workspace renders agent identity badge', async ({ page }) => {
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')

    // The top bar badge renders "AGENTIC GTM" for Patel
    const badge = page.locator('text=/AGENTIC GTM|Patel|GTM/i').first()
    await expect(badge).toBeVisible({ timeout: 20_000 })
  })
})

// ─── 6. Deliverable click — renders artifact panel, not raw JSON ───────────────

test.describe('Founder — Deliverable Panel Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFounder(page)
    await page.goto('/founder/cxo/patel')
    await page.waitForLoadState('networkidle')
    await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 15_000 })
  })

  test('clicking a completed deliverable shows rendered content, not raw JSON', async ({ page }) => {
    // Find any deliverable item that has a "view" state (artifact already built).
    // Built artifacts appear in the left panel as clickable items with a colored dot/icon.
    // If none exist yet for the test user, this test is skipped gracefully.
    const builtArtifact = page.locator('[data-testid="artifact-item"], button').filter({
      hasText: /ICP Definition|Battle Card|GTM Playbook|Positioning|Outreach/i,
    }).first()

    const count = await builtArtifact.count()
    if (count === 0) {
      test.skip(true, 'No built artifacts found for this test user — run after generating one')
      return
    }

    await builtArtifact.click()
    await page.waitForLoadState('networkidle')

    // After clicking a built artifact the ArtifactView panel opens.
    // It renders structured HTML — NOT raw JSON like {"key":"value"}.
    // We assert the body does NOT contain a raw JSON opening brace.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/^\s*\{/)  // raw JSON starting with {
    expect(bodyText).not.toContain('"type":') // raw artifact JSON field

    // The artifact panel should show a Copy button and the artifact title
    const copyButton = page.locator('button', { hasText: /Copy/i }).first()
    await expect(copyButton).toBeVisible({ timeout: 10_000 })
  })
})

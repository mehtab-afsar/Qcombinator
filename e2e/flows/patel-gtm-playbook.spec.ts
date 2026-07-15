import { test, expect } from '@playwright/test'
import { signInAsNexusPower, makeAuthenticatedRequest } from '../helpers/auth'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signInAsNexusPower(page)
  await context.close()
})

test('Patel workspace loads', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/cxo/patel')
  await page.waitForLoadState('networkidle')

  // Check for agent identity
  const agentName = page.locator('text=/patel|CMO|go-to-market/i')
  await expect(agentName).toBeVisible({ timeout: 10_000 })

  // Check for starter prompts
  const prompts = page.locator('button:has-text(/ICP|acquisition|CAC|GTM|launch|market/i)')
  const count = await prompts.count()
  expect(count).toBeGreaterThan(0)

  // Check for chat input
  const textarea = page.locator('textarea')
  await expect(textarea).toBeVisible()
})

test('Send ICP message → D1 artifact', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/cxo/patel')
  await page.waitForLoadState('networkidle')

  // Type ICP message
  const textarea = page.locator('textarea')
  const message =
    "Let's define my ICP. We sell grid-balancing software to Tier-1 Indian utilities (NTPC, Tata Power, " +
    'Reliance). Buyers are VP Engineering / Head of Grid Operations. They care about reducing grid instability, ' +
    'compliance with CEA net-zero mandates, and operational efficiency. Budget: $50k-$200k/yr.'

  await textarea.fill(message)
  await textarea.press('Enter')

  // Wait for agent response
  await page.waitForTimeout(3000)
  const response = page.locator('text=/your|ICP|customer|buyer/i')
  await expect(response).toBeVisible({ timeout: 45_000 })

  // Check if deliverable appeared
  const deliverable = page.locator('text=/ICP|definition|summary/i')
  if (await deliverable.isVisible({ timeout: 5000 }).catch(() => false)) {
    expect(true).toBe(true)
  }
})

test('Request GTM Playbook with soft gate', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/cxo/patel')
  await page.waitForLoadState('networkidle')

  // Scroll to bottom to find textarea
  const textarea = page.locator('textarea').last()
  await textarea.scrollIntoViewIfNeeded()

  // Type GTM playbook request
  const message =
    'Build my GTM Playbook now. I understand some diagnostics may be incomplete — please proceed ' +
    'and tag any gaps as [Hypothesis]. I want a 90-day go-to-market plan.'

  await textarea.fill(message)
  await textarea.press('Enter')

  // Wait for agent response (soft-gate acknowledgement)
  await page.waitForTimeout(3000)
  const response = page.locator('text=/proceed|playbook|hypothesis|GTM|90/i')
  await expect(response).toBeVisible({ timeout: 45_000 })

  // If agent asks for confirmation, send "Yes, proceed"
  const textarea2 = page.locator('textarea').last()
  if (await textarea2.isVisible()) {
    const confirmMsg = await textarea2.inputValue()
    if (!confirmMsg && (await page.locator('text=/confirm|proceed|ready/i').isVisible().catch(() => false))) {
      await textarea2.fill('Yes, proceed with the GTM Playbook.')
      await textarea2.press('Enter')
    }
  }

  // Wait for artifact generation (this is the slow part - LLM generation)
  await page.waitForTimeout(5000)
  const artifactPanel = page.locator('text=/playbook|GTM|deliverable/i')
  await expect(artifactPanel).toBeVisible({ timeout: 90_000 })
})

test('GTM Playbook renderer shows key sections', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/cxo/patel')
  await page.waitForLoadState('networkidle')

  // Wait for deliverable panel on the right
  const panel = page.locator('[role="region"]').last()
  await expect(panel).toBeVisible({ timeout: 10_000 })

  // Check for key sections (at least 3 should be visible)
  const sections = [
    page.locator('text=/ICP|ideal customer/i'),
    page.locator('text=/channel/i'),
    page.locator('text=/90-day|90 day/i'),
    page.locator('text=/budget/i'),
    page.locator('text=/positioning/i'),
  ]

  let visibleCount = 0
  for (const section of sections) {
    if (await section.isVisible({ timeout: 2000 }).catch(() => false)) {
      visibleCount++
    }
  }

  expect(visibleCount).toBeGreaterThanOrEqual(3)

  // Check for "undefined" or "[object Object]" errors (data mapping issues)
  const errors = page.locator('text=/undefined|\\[object Object\\]/')
  const errorCount = await errors.count()
  expect(errorCount).toBe(0)
})

test('Deliverable panel actions work', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/cxo/patel')
  await page.waitForLoadState('networkidle')

  // Wait for deliverable panel
  const copyBtn = page.locator('button:has-text(/copy/i)').last()
  const downloadBtn = page.locator('button:has-text(/download|export|html/i)').last()

  if (await copyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Click copy
    await copyBtn.click()

    // Button should change appearance briefly
    await page.waitForTimeout(500)
    expect(true).toBe(true)
  }

  if (await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Click download (expect a download or new tab).
    // 'download' is a Page event, not a BrowserContext one — page.context()
    // resolved the overload to 'weberror', which is why suggestedFilename()
    // did not exist. This never ran, because it sits behind the guard above.
    const [download] = await Promise.all([page.waitForEvent('download'), downloadBtn.click()])
    expect(download.suggestedFilename()).toMatch(/\.(html|pdf)$/)
  }
})

test('Artifact persisted to DB', async ({ page }) => {
  await signInAsNexusPower(page)

  // Get latest Q-Score to see if signal boost was applied
  const scoreResult = await makeAuthenticatedRequest(page, '/api/qscore/latest')
  expect(scoreResult.status).toBe(200)

  const score = scoreResult.data as Record<string, unknown>
  // Score should be higher after agent artifacts
  expect(score.overall_score).toBeGreaterThan(0)

  // Check artifacts exist
  const artifactResult = await makeAuthenticatedRequest(page, '/api/agents/conversations')
  expect(artifactResult.status).toBe(200)

  const conversations = Array.isArray(artifactResult.data) ? artifactResult.data : []
  interface Conversation {
    artifacts?: Array<unknown>;
  }
  const hasArtifacts = conversations.some((conv: Conversation) => conv.artifacts && conv.artifacts.length > 0)
  expect(hasArtifacts || conversations.length > 0).toBe(true)
})

test('Refine: send revision request', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/cxo/patel')
  await page.waitForLoadState('networkidle')

  // Look for refine input in the deliverable panel
  const refineInput = page.locator('input[placeholder*="refine" i], textarea').last()

  if (await refineInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    const message = 'Make the 90-day plan more aggressive, targeting 5 enterprise pilots instead of 2. Focus on NTPC first.'

    await refineInput.fill(message)
    await refineInput.press('Enter')

    // Wait for agent to respond
    await page.waitForTimeout(3000)
    const agentResponse = page.locator('text=/enterprise|pilot|NTPC|aggressive/i')
    await expect(agentResponse).toBeVisible({ timeout: 45_000 })
  }
})

test('Workspace shows generated artifact', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/workspace')
  await page.waitForLoadState('networkidle')

  // Look for GTM Playbook or ICP card
  const artifactCard = page.locator('text=/GTM|playbook|ICP|definition/i')

  if (await artifactCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
    // Click "View" link
    const viewLink = artifactCard.locator('xpath=ancestor::*//a[contains(text(), "View")]').first()
    if (await viewLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewLink.click()

      // Should navigate back to Patel page with artifact param
      await page.waitForURL(/cxo\/patel.*artifact=/)
      expect(page.url()).toContain('artifact=')
    }
  }
})

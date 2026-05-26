/**
 * Marketplace interaction helpers — connections, messaging, notifications,
 * portfolio company invites. Used by full-marketplace-journey.spec.ts.
 */

import { Page } from '@playwright/test'

// ─── connection helpers ────────────────────────────────────────────────────────

/**
 * From the founder matching page, find an investor card and send a connection request.
 * Returns true if the request was sent successfully.
 */
export async function sendConnectionRequest(
  page: Page,
  investorHint: string,       // partial name or firm name to match
  personalMessage: string,
): Promise<boolean> {
  await page.goto('/founder/matching')
  await page.waitForLoadState('networkidle')

  // Wait for investor cards to load (or Q-Score gating message)
  await page.waitForFunction(
    () => document.body.innerText.length > 200,
    { timeout: 20_000 },
  )

  // Try to find an investor card matching the hint
  const investorCard = page.locator(`text=/${investorHint}/i`).first()
  const cardVisible  = await investorCard.isVisible().catch(() => false)

  if (!cardVisible) {
    // May be Q-Score gated or hint not matching — try clicking first available Connect button
    const connectBtn = page.locator(
      'button:has-text("Connect"), button:has-text("Request"), button:has-text("Message")'
    ).first()
    if (!await connectBtn.isVisible().catch(() => false)) return false
    await connectBtn.click()
  } else {
    // Click Connect within the card
    const connectBtn = investorCard
      .locator('xpath=ancestor-or-self::*[@class][last()]')
      .locator('button:has-text("Connect"), button:has-text("Request"), button:has-text("Message")')
      .first()
    if (!await connectBtn.isVisible().catch(() => false)) {
      // Fallback: click any Connect button on the page
      const fallback = page.locator('button:has-text("Connect"), button:has-text("Request")').first()
      if (!await fallback.isVisible().catch(() => false)) return false
      await fallback.click()
    } else {
      await connectBtn.click()
    }
  }

  // Fill personal message if a modal/textarea appeared
  await page.waitForTimeout(1_000)
  const msgInput = page.locator('textarea, input[placeholder*="message"], input[placeholder*="personal"]').last()
  if (await msgInput.isVisible().catch(() => false)) {
    await msgInput.fill(personalMessage)
  }

  // Submit
  const submitBtn = page.locator(
    'button:has-text("Send"), button:has-text("Submit"), button[type="submit"]'
  ).last()
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click()
    await page.waitForTimeout(2_000)
    return true
  }

  return false
}

/**
 * As an investor, accept a connection request from the Messages page.
 * Returns true if the request was found and accepted.
 */
export async function acceptConnectionRequest(
  page: Page,
  founderHint: string,  // partial name or company to match
): Promise<boolean> {
  await page.goto('/investor/messages')
  await page.waitForLoadState('networkidle')

  // Try clicking Requests tab
  const requestsTab = page.locator(
    'button:has-text("Requests"), [role="tab"]:has-text("Requests"), span:has-text("Requests")'
  ).first()
  if (await requestsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await requestsTab.click()
    await page.waitForTimeout(1_000)
  }

  // Look for the founder's request
  const founderCard = page.locator(`text=/${founderHint}/i`).first()
  if (await founderCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await founderCard.click()
    await page.waitForTimeout(1_000)
  }

  // Click Accept
  const acceptBtn = page.locator(
    'button:has-text("Accept"), button:has-text("Connect"), button:has-text("Approve")'
  ).first()
  if (!await acceptBtn.isVisible({ timeout: 8_000 }).catch(() => false)) return false

  await acceptBtn.click()
  await page.waitForTimeout(2_000)
  return true
}

// ─── messaging helpers ────────────────────────────────────────────────────────

/**
 * Send a message in the currently-open conversation thread.
 */
export async function sendMessage(page: Page, message: string): Promise<void> {
  const input = page.locator(
    'input[placeholder*="message"], input[placeholder*="Message"], textarea[placeholder*="message"], textarea[placeholder*="Message"]'
  ).last()

  await input.waitFor({ state: 'visible', timeout: 15_000 })
  await input.fill(message)

  // Send via Enter or button
  const sendBtn = page.locator(
    'button[type="submit"], button:has-text("Send")'
  ).last()
  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.click()
  } else {
    await input.press('Enter')
  }
  await page.waitForTimeout(1_500)
}

/**
 * Open a conversation thread (investor or founder messages page).
 * Returns true if the thread was found.
 */
export async function openConversationThread(page: Page, hint: string): Promise<boolean> {
  const thread = page.locator(`text=/${hint}/i`).first()
  if (!await thread.isVisible({ timeout: 10_000 }).catch(() => false)) return false
  await thread.click()
  await page.waitForLoadState('networkidle')
  return true
}

// ─── notification helpers ──────────────────────────────────────────────────────

export interface Notification {
  id: string
  type: string
  title: string
  read: boolean
  created_at: string
}

/**
 * Fetch notifications for the currently logged-in user via API.
 */
export async function getNotifications(page: Page): Promise<Notification[]> {
  return page.evaluate(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : (data.notifications ?? [])
    } catch {
      return []
    }
  })
}

/**
 * Assert that a notification of a given type exists in the last N notifications.
 * Returns the matching notification or null.
 */
export async function findNotificationOfType(
  page: Page,
  type: string,
): Promise<Notification | null> {
  const notifications = await getNotifications(page)
  return notifications.find(n => n.type === type || n.title?.toLowerCase().includes(type.toLowerCase())) ?? null
}

// ─── portfolio company helpers ─────────────────────────────────────────────────

/**
 * As an investor, add a company to portfolio companies via the UI.
 * Returns the invite token from the DB after creation (via API lookup).
 */
export async function addPortfolioCompany(
  page: Page,
  opts: {
    companyName: string
    founderEmail: string
    founderName?: string
    sector?: string
    stage?: string
    sendInvite?: boolean
  },
): Promise<boolean> {
  await page.goto('/investor/portfolio-companies')
  await page.waitForLoadState('networkidle')

  const addBtn = page.locator('button:has-text("Add Company"), button:has-text("+ Add")').first()
  if (!await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)) return false
  await addBtn.click()

  await page.waitForTimeout(500)

  // Fill form
  const nameInput = page.locator('input[placeholder*="Acme"], input[placeholder*="company"], input[placeholder*="Company"]').first()
  if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await nameInput.fill(opts.companyName)
  }

  if (opts.founderName) {
    const fnInput = page.locator('input[placeholder*="Jane"], input[placeholder*="founder"], input[placeholder*="Founder"]').first()
    if (await fnInput.isVisible().catch(() => false)) await fnInput.fill(opts.founderName)
  }

  const emailInput = page.locator('input[type="email"]').first()
  if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await emailInput.fill(opts.founderEmail)
  }

  // Toggle "send invite now"
  if (opts.sendInvite !== false) {
    await page.waitForTimeout(500) // Let checkbox appear after email fill
    const inviteToggle = page.locator(
      'input[type="checkbox"], label:has-text("Send invite"), label:has-text("invite")'
    ).first()
    if (await inviteToggle.isVisible().catch(() => false)) {
      const checkbox = inviteToggle.locator('input[type="checkbox"]')
      const cbVisible = await checkbox.isVisible().catch(() => false)
      const isChecked = cbVisible
        ? await checkbox.isChecked().catch(() => false)
        : await inviteToggle.isChecked().catch(() => false)
      if (!isChecked) await inviteToggle.click()
    }
  }

  // Submit
  const submitBtn = page.locator('button:has-text("Add Company"), button[type="submit"]').last()
  if (!await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return false
  await submitBtn.click()
  await page.waitForTimeout(2_000)
  return true
}

/**
 * Lookup the invite token for a portfolio company by founder email.
 * Uses the Supabase Admin API — requires service role key.
 */
export async function getPortfolioInviteToken(founderEmail: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/investor_portfolio_companies?founder_email=eq.${encodeURIComponent(founderEmail)}&select=invite_token&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=representation',
        },
      }
    )
    if (!res.ok) return null
    const rows = await res.json() as Array<{ invite_token: string }>
    return rows[0]?.invite_token ?? null
  } catch {
    return null
  }
}

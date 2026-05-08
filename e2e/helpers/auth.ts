import { Page } from '@playwright/test'

export const TEST_FOUNDER_EMAIL =
  process.env.TEST_FOUNDER_EMAIL ?? 'test-founder@edgealpha.test'
export const TEST_FOUNDER_PASSWORD =
  process.env.TEST_FOUNDER_PASSWORD ?? 'TestPass123!'
export const TEST_INVESTOR_EMAIL =
  process.env.TEST_INVESTOR_EMAIL ?? 'test-investor@edgealpha.test'
export const TEST_INVESTOR_PASSWORD =
  process.env.TEST_INVESTOR_PASSWORD ?? 'TestPass123!'

/**
 * Sign in as a founder and wait for redirect to /founder/* area.
 * The login page uses Supabase client-side auth then calls router.push(),
 * so we wait for the URL to match /founder/ before continuing.
 */
export async function signInAsFounder(page: Page): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', TEST_FOUNDER_EMAIL)
  await page.fill('input[type="password"]', TEST_FOUNDER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/founder/, { timeout: 15_000 })
}

/**
 * Sign in as an investor and wait for redirect to /investor/* area.
 */
export async function signInAsInvestor(page: Page): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', TEST_INVESTOR_EMAIL)
  await page.fill('input[type="password"]', TEST_INVESTOR_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/investor/, { timeout: 15_000 })
}

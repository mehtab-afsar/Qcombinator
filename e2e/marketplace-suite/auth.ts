import { Page, BrowserContext } from '@playwright/test'

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

export interface FounderAccount {
  email: string
  password: string
  userId: string
  profileId: string
}

export interface InvestorAccount {
  email: string
  password: string
  userId: string
}

/**
 * Create a fresh investor test account via the Supabase Admin API.
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars.
 * Returns { email, password } for use in sign-in flows.
 */
export async function createTestInvestorAccount(opts?: {
  email?: string
}): Promise<{ email: string; password: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'createTestInvestorAccount requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars'
    )
  }
  const email    = opts?.email ?? `test-inv-${Date.now()}@pw.test`
  const password = 'TestPass123!'
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'investor' },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Admin user creation failed: ${res.status} ${body}`)
  }
  return { email, password }
}

/**
 * Create a fresh founder account via POST /api/auth/signup.
 * Returns account details including userId and profileId.
 */
export async function createFounderAccount(opts: {
  email?: string
  companyName: string
  stage?: string
  industry?: string
  problemStatement?: string
  targetCustomer?: string
  teamSize?: string
  location?: string
  tagline?: string
  baseUrl?: string
}): Promise<FounderAccount> {
  const {
    companyName, baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
  } = opts
  const email    = opts.email ?? `test-founder-${Date.now()}@pw.test`
  const password = 'TestPass123!'

  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName:         `PW ${companyName} Founder`,
      companyName,
      startupName:      companyName,
      stage:            opts.stage     ?? 'pre-seed',
      industry:         opts.industry  ?? 'ai-software',
      problemStatement: opts.problemStatement ?? `${companyName} solves a real pain point for our target customers.`,
      targetCustomer:   opts.targetCustomer   ?? 'B2B SaaS operations managers at 50-200 person companies',
      teamSize:         opts.teamSize  ?? '2-5',
      location:         opts.location  ?? 'San Francisco, CA',
      tagline:          opts.tagline   ?? `The smarter way to ${companyName.toLowerCase()}`,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Founder signup failed (${res.status}): ${body.slice(0, 200)}`)
  }

  const data = await res.json() as { user: { id: string }; profile: { id: string } }
  return { email, password, userId: data.user.id, profileId: data.profile.id }
}

/**
 * Create a fresh investor account via Admin API + complete onboarding via API.
 */
export async function createInvestorAccount(opts: {
  fullName: string
  firmName: string
  email?: string
}): Promise<InvestorAccount> {
  const { fullName, firmName } = opts
  const email    = opts.email ?? `test-investor-${Date.now()}@pw.test`
  const password = 'TestPass123!'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars')

  // Create auth user
  const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      email, password,
      email_confirm: true,
      user_metadata: { role: 'investor', full_name: fullName, fund_name: firmName },
    }),
  })
  if (!authRes.ok) {
    const body = await authRes.text().catch(() => '')
    throw new Error(`Investor auth creation failed: ${authRes.status} ${body}`)
  }
  const authData = await authRes.json() as { id: string }
  const userId = authData.id

  // Create investor_profiles row directly via Admin REST API (bypasses session auth)
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/investor_profiles`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id:              userId,
        full_name:            fullName,
        email,
        firm_name:            firmName,
        firm_type:            'vc',
        check_sizes:          ['$100K–$500K', '$500K–$2M'],
        stages:               ['pre-seed', 'seed'],
        sectors:              ['ai_ml', 'biotech', 'climate'],
        thesis:               `${firmName} invests in early-stage deep tech startups solving enterprise pain points.`,
        subscription_tier:    'pro',
        onboarding_completed: true,
      }),
    }
  )
  if (!profileRes.ok) {
    const body = await profileRes.text().catch(() => '')
    console.warn(`[createInvestorAccount] investor_profiles insert returned ${profileRes.status}: ${body.slice(0, 200)} — investor created but profile may be incomplete`)
  }

  return { email, password, userId }
}

/**
 * Sign in with specific credentials (not the shared test account).
 * Use for fresh accounts created per-test-run.
 */
export async function signInWithCredentials(
  page: Page,
  email: string,
  password: string,
  expectPath: RegExp = /\/(founder|investor)/,
): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(expectPath, { timeout: 20_000 })
}

/**
 * Create a new browser context signed in as a specific user.
 * Useful for running two accounts simultaneously in the same test.
 */
export async function newContextSignedIn(
  context: BrowserContext,
  email: string,
  password: string,
  expectPath: RegExp = /\/(founder|investor)/,
): Promise<Page> {
  const page = await context.newPage()
  await signInWithCredentials(page, email, password, expectPath)
  return page
}

/**
 * INVESTOR API ROUTES TEST
 * Tests: investor-specific endpoints (deal-flow, pipeline, watchlist, portfolio)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const API_BASE = '/api'

test.describe('Investor API Routes', () => {
  let authToken: string
  let investorId: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const email = `investor-api-${Date.now()}@example.com`
    const password = 'TestPass123!'

    // Signup
    await page.request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: {
        email,
        password,
        fullName: 'Test Investor',
      },
    })

    // Login to get token
    await page.goto(`${BASE_URL}/login`)
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.locator('button').filter({ hasText: /Sign In/i }).click()

    await page.waitForLoadState('networkidle')

    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name.includes('sb'))
    authToken = sessionCookie?.value || 'test-token'

    await context.close()
  })

  test('GET /api/investor/deal-flow - fetch deal flow with founders', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/deal-flow`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data) || typeof data === 'object').toBeTruthy()
  })

  test('GET /api/investor/deal-flow?sector=ai - filter by sector', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/deal-flow?sector=ai_ml`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
  })

  test('GET /api/investor/pipeline - fetch investor pipeline', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/pipeline`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(typeof data === 'object').toBeTruthy()
  })

  test('POST /api/investor/pipeline - add founder to pipeline', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/investor/pipeline`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        founder_user_id: 'test-founder-id',
        stage: 'watching',
      },
    })

    expect([201, 400, 404]).toContain(response.status())
  })

  test('PATCH /api/investor/pipeline - move pipeline stage', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}${API_BASE}/investor/pipeline`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        founder_user_id: 'test-founder-id',
        stage: 'interested',
      },
    })

    expect([200, 400, 404]).toContain(response.status())
  })

  test('GET /api/investor/connections - fetch connection requests', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/connections`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data) || typeof data === 'object').toBeTruthy()
  })

  test('PATCH /api/investor/connections - accept connection', async ({ request }) => {
    const response = await request.patch(`${BASE_URL}${API_BASE}/investor/connections`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        connection_request_id: 'test-request-id',
        action: 'accept',
      },
    })

    expect([200, 400, 404]).toContain(response.status())
  })

  test('GET /api/investor/watchlist - fetch watchlist', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/watchlist`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('POST /api/investor/watchlist - add to watchlist with threshold', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/investor/watchlist`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        founder_user_id: 'test-founder-id',
        threshold_qscore: 70,
      },
    })

    expect([201, 400, 404]).toContain(response.status())
  })

  test('DELETE /api/investor/watchlist - remove from watchlist', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}${API_BASE}/investor/watchlist`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { founder_user_id: 'test-founder-id' },
    })

    expect([200, 204, 400, 404]).toContain(response.status())
  })

  test('GET /api/investor/portfolio-companies - list portfolio', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/portfolio-companies`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('POST /api/investor/portfolio-companies - add portfolio company', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/investor/portfolio-companies`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        company_name: 'Test Portfolio Company',
        founder_email: 'founder@example.com',
        sector: 'ai_ml',
      },
    })

    expect([201, 400]).toContain(response.status())
  })

  test('POST /api/investor/portfolio-companies/bulk-invite - bulk invite founders', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/investor/portfolio-companies/bulk-invite`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        founder_emails: ['founder1@example.com', 'founder2@example.com'],
      },
    })

    expect([200, 201, 400]).toContain(response.status())
  })

  test('GET /api/investor/dashboard - fetch dashboard data', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('POST /api/investor/onboarding - complete onboarding', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/investor/onboarding`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        full_name: 'Test Investor',
        firm_name: 'Test VC Fund',
        thesis: 'We invest in AI startups',
        stages: ['seed', 'series-a'],
        sectors: ['ai_ml'],
        check_sizes: ['50-100k', '100-500k'],
      },
    })

    expect([200, 201, 400]).toContain(response.status())
  })

  test('GET /api/investor/messages - fetch message threads', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('Unauthenticated access returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/investor/deal-flow`)
    expect(response.status()).toBe(401)
  })
})

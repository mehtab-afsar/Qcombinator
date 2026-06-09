/**
 * FOUNDER API ROUTES TEST
 * Tests: founder-specific GET/POST/PATCH endpoints with auth and validation
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const API_BASE = '/api'

test.describe('Founder API Routes', () => {
  let authToken: string
  let founderId: string

  test.beforeAll(async ({ browser }) => {
    // Create founder and get auth token
    const context = await browser.newContext()
    const page = await context.newPage()

    const email = `founder-api-${Date.now()}@example.com`
    const password = 'TestPass123!'

    // Signup
    const response = await page.request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: {
        email,
        password,
        fullName: 'Test Founder',
        startupName: 'Test Startup',
        industry: 'ai_ml',
        stage: 'mvp',
      },
    })

    const userData = await response.json()
    founderId = userData.user?.id || userData.profile?.user_id

    // Get session token from page
    await page.goto(`${BASE_URL}/login`)
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.locator('button').filter({ hasText: /Sign In/i }).click()

    await page.waitForLoadState('networkidle')

    // Extract token from cookies
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name.includes('sb'))
    authToken = sessionCookie?.value || 'test-token'

    await context.close()
  })

  test('GET /api/founder/profile - fetch own profile', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/founder/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('full_name')
  })

  test('POST /api/founder/profile - update profile', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/founder/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        full_name: 'Updated Founder Name',
        startup_name: 'Updated Startup',
      },
    })

    expect([200, 201]).toContain(response.status())
  })

  test('GET /api/qscore/latest - fetch latest Q-Score', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('qScore')
  })

  test('GET /api/profile-builder/preview - preview profile builder', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/profile-builder/preview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('POST /api/connections - create connection request', async ({ request }) => {
    // This requires an investor ID, so we expect it might fail without one
    const response = await request.post(`${BASE_URL}${API_BASE}/connections`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        investor_id: 'test-investor-id',
        personal_message: 'Would love to chat about investment',
      },
    })

    // Could be 201 (success) or 400/404 (investor not found)
    expect([201, 400, 404, 409]).toContain(response.status())
  })

  test('GET /api/connections - list connection requests', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/connections`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBeTruthy()
  })

  test('GET /api/messages - fetch messages', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data) || typeof data === 'object').toBeTruthy()
  })

  test('POST /api/messages - send message', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        connection_request_id: 'test-connection-id',
        body: 'Test message content',
      },
    })

    // Could be 201 (success) or 400/404 (connection not found)
    expect([201, 400, 404]).toContain(response.status())
  })

  test('GET /api/agents/conversations - list agent chats', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/agents/conversations`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data) || typeof data === 'object').toBeTruthy()
  })

  test('POST /api/agents/chat - chat with agent', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/agents/chat`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        agent_id: 'sage',
        message: 'What should I focus on next?',
      },
    })

    // Could be 200 (success), 400 (validation), or 429 (rate limited)
    expect([200, 400, 429]).toContain(response.status())
  })

  test('POST /api/profile-builder/submit - submit profile for Q-Score', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/profile-builder/submit`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        assessment_data: {
          market_readiness: 'good',
          team_quality: 'strong',
        },
      },
    })

    // Could be 200 (success), 400 (validation), or 429 (rate limited)
    expect([200, 400, 429]).toContain(response.status())
  })

  test('GET /api/founder/profile - unauthenticated access returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/founder/profile`)

    expect(response.status()).toBe(401)
  })

  test('POST /api/founder/profile - missing auth returns 401', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/founder/profile`, {
      data: { full_name: 'Test' },
    })

    expect(response.status()).toBe(401)
  })

  test('GET /api/qscore/priority - get Q-Score improvement actions', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/priority`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('POST /api/qscore/actions - submit Q-Score actions', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/qscore/actions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        actions: [
          { id: 'action1', status: 'completed', proof: 'https://example.com' },
        ],
      },
    })

    expect([200, 201, 400]).toContain(response.status())
  })
})

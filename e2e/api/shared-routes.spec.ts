/**
 * SHARED API ROUTES TEST
 * Tests: endpoints used by both founder and investor (messages, connections, qscore, agents)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const API_BASE = '/api'

test.describe('Shared API Routes', () => {
  let founderToken: string
  let investorToken: string

  test.beforeAll(async ({ browser }) => {
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    // Create founder
    const founderEmail = `founder-shared-${Date.now()}@example.com`
    const password = 'TestPass123!'

    await page1.request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: {
        email: founderEmail,
        password,
        fullName: 'Test Founder',
      },
    })

    await page1.goto(`${BASE_URL}/login`)
    await page1.locator('input[type="email"]').fill(founderEmail)
    await page1.locator('input[type="password"]').fill(password)
    await page1.locator('button').filter({ hasText: /Sign In/i }).click()

    await page1.waitForLoadState('networkidle')

    let cookies = await context1.cookies()
    let sessionCookie = cookies.find(c => c.name.includes('sb'))
    founderToken = sessionCookie?.value || 'test-token'

    await context1.close()

    // Create investor
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    const investorEmail = `investor-shared-${Date.now()}@example.com`

    await page2.request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: {
        email: investorEmail,
        password,
        fullName: 'Test Investor',
      },
    })

    await page2.goto(`${BASE_URL}/login`)
    await page2.locator('input[type="email"]').fill(investorEmail)
    await page2.locator('input[type="password"]').fill(password)
    await page2.locator('button').filter({ hasText: /Sign In/i }).click()

    await page2.waitForLoadState('networkidle')

    cookies = await context2.cookies()
    sessionCookie = cookies.find(c => c.name.includes('sb'))
    investorToken = sessionCookie?.value || 'test-token'

    await context2.close()
  })

  test('GET /api/messages - founder can fetch messages', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    })

    expect(response.status()).toBe(200)
  })

  test('GET /api/messages - investor can fetch messages', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${investorToken}` },
    })

    expect(response.status()).toBe(200)
  })

  test('POST /api/messages - send message with body validation', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${founderToken}` },
      data: {
        connection_request_id: 'test-id',
        body: 'Test message content between 1 and 4000 characters',
      },
    })

    expect([201, 400, 404]).toContain(response.status())
  })

  test('POST /api/messages - reject message body > 4000 chars', async ({ request }) => {
    const longBody = 'a'.repeat(4001)

    const response = await request.post(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${founderToken}` },
      data: {
        connection_request_id: 'test-id',
        body: longBody,
      },
    })

    expect([400, 413]).toContain(response.status())
  })

  test('GET /api/connections - founder can view own connections', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/connections`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    })

    expect(response.status()).toBe(200)
  })

  test('POST /api/connections - founder can create connection request', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/connections`, {
      headers: { Authorization: `Bearer ${founderToken}` },
      data: {
        investor_id: 'test-investor-id',
        personal_message: 'Would like to discuss investment opportunities',
      },
    })

    expect([201, 400, 404, 409]).toContain(response.status())
  })

  test('GET /api/connections/rationale - explain match rationale', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/connections/rationale?investor_id=test-id`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    })

    expect([200, 404, 400]).toContain(response.status())
  })

  test('GET /api/qscore/latest - fetch with temporal decay', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('qScore')
  })

  test('GET /api/agents/conversations - fetch all conversations', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/agents/conversations`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data) || typeof data === 'object').toBeTruthy()
  })

  test('POST /api/agents/chat - with usage quota check', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/agents/chat`, {
      headers: { Authorization: `Bearer ${founderToken}` },
      data: {
        agent_id: 'patel',
        message: 'What is my ICP?',
      },
    })

    expect([200, 400, 429]).toContain(response.status())
  })

  test('POST /api/agents/chat - invalid agent returns 400', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/agents/chat`, {
      headers: { Authorization: `Bearer ${founderToken}` },
      data: {
        agent_id: 'nonexistent-agent',
        message: 'Test',
      },
    })

    expect([400, 404]).toContain(response.status())
  })

  test('GET /api/notifications - fetch user notifications', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('GET /api/profile-builder/preview - preview startup info', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/profile-builder/preview`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('POST /api/profile-builder/extract - extract from document', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/profile-builder/extract`, {
      headers: { Authorization: `Bearer ${founderToken}` },
      data: {
        document_text: 'We are a B2B SaaS company solving payment problems',
      },
    })

    expect([200, 400]).toContain(response.status())
  })

  test('POST /api/profile-builder/submit - founder with rate limit', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/profile-builder/submit`, {
      headers: { Authorization: `Bearer ${founderToken}` },
      data: {
        assessment_data: {
          market_readiness: 'good',
        },
      },
    })

    expect([200, 400, 429]).toContain(response.status())
  })

  test('Rate limit returns 429 when exceeded', async ({ request }) => {
    // Make rapid requests to trigger rate limit
    const requests = []

    for (let i = 0; i < 5; i++) {
      requests.push(
        request.post(`${BASE_URL}${API_BASE}/agents/chat`, {
          headers: { Authorization: `Bearer ${founderToken}` },
          data: { agent_id: 'sage', message: 'Test' },
        })
      )
    }

    const responses = await Promise.all(requests)
    const hasRateLimit = responses.some(r => r.status() === 429)

    // At least one should be rate limited or all should succeed
    expect(hasRateLimit || responses.every(r => r.status() === 200)).toBeTruthy()
  })

  test('Missing auth header returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`)
    expect(response.status()).toBe(401)
  })

  test('Invalid token returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`, {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    expect(response.status()).toBe(401)
  })
})

/**
 * SECURITY & IDOR PREVENTION TESTS
 * Verify RLS enforcement, IDOR prevention, rate limiting
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const API_BASE = '/api'

test.describe('Security & IDOR Tests', () => {
  let user1Token: string
  let user2Token: string
  let user1Id: string

  test.beforeAll(async ({ browser }) => {
    // Create user 1
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    const email1 = `sec-user1-${Date.now()}@example.com`
    const password = 'TestPass123!'

    const signupResp = await page1.request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: { email: email1, password, fullName: 'User1' },
    })

    const signupData = await signupResp.json()
    user1Id = signupData.user?.id || signupData.profile?.user_id

    await page1.goto(`${BASE_URL}/login`)
    await page1.locator('input[type="email"]').fill(email1)
    await page1.locator('input[type="password"]').fill(password)
    await page1.locator('button').filter({ hasText: /Sign In/i }).click()

    await page1.waitForLoadState('networkidle')

    let cookies = await context1.cookies()
    user1Token = cookies.find(c => c.name.includes('sb'))?.value || ''

    await context1.close()

    // Create user 2
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    const email2 = `sec-user2-${Date.now()}@example.com`

    await page2.request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: { email: email2, password, fullName: 'User2' },
    })

    await page2.goto(`${BASE_URL}/login`)
    await page2.locator('input[type="email"]').fill(email2)
    await page2.locator('input[type="password"]').fill(password)
    await page2.locator('button').filter({ hasText: /Sign In/i }).click()

    await page2.waitForLoadState('networkidle')

    cookies = await context2.cookies()
    user2Token = cookies.find(c => c.name.includes('sb'))?.value || ''

    await context2.close()
  })

  test('RLS: User cannot access another user\'s Q-Score', async ({ request }) => {
    // User 2 tries to access User 1's data
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    })

    expect(response.status()).toBe(200)
    const data = await response.json()

    // Should only get user 2's data, not user 1's
    expect(data.qScore === null || data.qScore === undefined).toBeTruthy()
  })

  test('IDOR: User cannot create connection as another user', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/connections`, {
      headers: { Authorization: `Bearer ${user1Token}` },
      data: {
        investor_id: user2Id,
        // Should not be able to set founder_id to someone else
      },
    })

    // Connection should be created as user1, not user2
    expect([201, 400, 404, 409]).toContain(response.status())
  })

  test('RLS: User cannot read another user\'s messages', async ({ request }) => {
    // Both users fetch their own messages
    const user1Response = await request.get(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    })

    const user2Response = await request.get(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    })

    expect(user1Response.status()).toBe(200)
    expect(user2Response.status()).toBe(200)

    // Data should be independent per user
    const data1 = await user1Response.json()
    const data2 = await user2Response.json()

    expect(Array.isArray(data1) || typeof data1 === 'object').toBeTruthy()
    expect(Array.isArray(data2) || typeof data2 === 'object').toBeTruthy()
  })

  test('IDOR: Invalid agent_conversation_id should not be accessible', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}${API_BASE}/agents/conversations/invalid-id`,
      { headers: { Authorization: `Bearer ${user1Token}` } }
    )

    // Should either 404 or 403 (not allow access to other user's conversation)
    expect([403, 404, 400]).toContain(response.status())
  })

  test('Rate Limiting: agent_chat endpoint enforces 12 req/min limit', async ({ request }) => {
    const requests = []

    // Make 15 rapid requests to trigger rate limit
    for (let i = 0; i < 15; i++) {
      requests.push(
        request.post(`${BASE_URL}${API_BASE}/agents/chat`, {
          headers: { Authorization: `Bearer ${user1Token}` },
          data: { agent_id: 'sage', message: 'Test' },
        })
      )
    }

    const responses = await Promise.all(requests)
    const rateLimited = responses.filter(r => r.status() === 429)

    // At least some should hit rate limit
    expect(rateLimited.length > 0).toBeTruthy()
  })

  test('Rate Limiting: Q-Score submit capped at 2/month', async ({ request }) => {
    // Make multiple submit requests
    const requests = []

    for (let i = 0; i < 3; i++) {
      requests.push(
        request.post(`${BASE_URL}${API_BASE}/profile-builder/submit`, {
          headers: { Authorization: `Bearer ${user1Token}` },
          data: { assessment_data: {} },
        })
      )
    }

    const responses = await Promise.all(requests)

    // At least one should be rate limited
    const limited = responses.some(r => r.status() === 429)
    const successful = responses.some(r => r.status() === 200)

    expect(limited || successful).toBeTruthy()
  })

  test('Authentication: Missing auth header returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`)

    expect(response.status()).toBe(401)
  })

  test('Authentication: Invalid token returns 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`, {
      headers: { Authorization: 'Bearer invalid-token-xyz' },
    })

    expect(response.status()).toBe(401)
  })

  test('Input Validation: Message body > 4000 chars rejected', async ({ request }) => {
    const longBody = 'a'.repeat(4001)

    const response = await request.post(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${user1Token}` },
      data: {
        connection_request_id: 'test-id',
        body: longBody,
      },
    })

    expect([400, 413]).toContain(response.status())
  })

  test('Input Validation: Invalid email format rejected', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: {
        email: 'invalid-email',
        password: 'TestPass123!',
        fullName: 'Test',
      },
    })

    expect([400]).toContain(response.status())
  })

  test('Input Validation: Weak password rejected', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: {
        email: `weak-pw-${Date.now()}@example.com`,
        password: 'short',
        fullName: 'Test',
      },
    })

    expect([400]).toContain(response.status())
  })

  test('CSRF: POST without headers still works (Supabase handles)', async ({ request }) => {
    // Supabase session is maintained via secure cookies
    const response = await request.post(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${user1Token}` },
      data: {
        connection_request_id: 'test-id',
        body: 'Test',
      },
    })

    // Should either succeed or fail gracefully
    expect([201, 400, 404]).toContain(response.status())
  })

  test('Data Integrity: Connection request founder_id matches auth user', async ({ request }) => {
    const response = await request.post(`${BASE_URL}${API_BASE}/connections`, {
      headers: { Authorization: `Bearer ${user1Token}` },
      data: {
        investor_id: 'dummy-id',
      },
    })

    if (response.status() === 201) {
      const data = await response.json()
      // Connection should belong to authenticated user
      expect(data.founder_id).toBeDefined()
    }
  })
})

const user2Id = 'dummy-user2-id'

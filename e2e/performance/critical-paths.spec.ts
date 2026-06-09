/**
 * PERFORMANCE BASELINE TESTS
 * Measure latency of critical paths against SLA targets
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const API_BASE = '/api'

test.describe('Performance Baseline Tests', () => {
  let authToken: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    const email = `perf-test-${Date.now()}@example.com`
    const password = 'TestPass123!'

    await page.request.post(`${BASE_URL}${API_BASE}/auth/signup`, {
      data: { email, password, fullName: 'Perf Test' },
    })

    await page.goto(`${BASE_URL}/login`)
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.locator('button').filter({ hasText: /Sign In/i }).click()

    await page.waitForLoadState('networkidle')

    const cookies = await context.cookies()
    authToken = cookies.find(c => c.name.includes('sb'))?.value || ''

    await context.close()
  })

  test('GET /api/investor/deal-flow - latency < 500ms', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.get(`${BASE_URL}${API_BASE}/investor/deal-flow`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    const latency = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(latency).toBeLessThan(500)
  })

  test('GET /api/qscore/latest - latency < 300ms', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.get(`${BASE_URL}${API_BASE}/qscore/latest`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    const latency = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(latency).toBeLessThan(300)
  })

  test('GET /api/investor/pipeline - latency < 300ms', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.get(`${BASE_URL}${API_BASE}/investor/pipeline`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    const latency = Date.now() - startTime

    expect([200, 400]).toContain(response.status())
    expect(latency).toBeLessThan(300)
  })

  test('POST /api/agents/chat - first-token latency < 1200ms', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.post(`${BASE_URL}${API_BASE}/agents/chat`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { agent_id: 'sage', message: 'Test' },
      timeout: 15000,
    })

    const latency = Date.now() - startTime

    expect([200, 400, 429]).toContain(response.status())
    expect(latency).toBeLessThan(1200)
  })

  test('GET /api/messages - latency < 200ms', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.get(`${BASE_URL}${API_BASE}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    const latency = Date.now() - startTime

    expect(response.status()).toBe(200)
    expect(latency).toBeLessThan(200)
  })

  test('POST /api/profile-builder/submit - latency < 8000ms', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.post(`${BASE_URL}${API_BASE}/profile-builder/submit`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { assessment_data: { test: 'data' } },
      timeout: 15000,
    })

    const latency = Date.now() - startTime

    expect([200, 400, 429]).toContain(response.status())
    expect(latency).toBeLessThan(8000)
  })

  test('Concurrent requests - 5 users hitting deal-flow simultaneously', async ({ request }) => {
    const startTime = Date.now()

    const promises = []
    for (let i = 0; i < 5; i++) {
      promises.push(
        request.get(`${BASE_URL}${API_BASE}/investor/deal-flow`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
      )
    }

    const responses = await Promise.all(promises)
    const latency = Date.now() - startTime

    responses.forEach(r => expect(r.status()).toBe(200))
    // All 5 concurrent requests should complete in < 2 seconds
    expect(latency).toBeLessThan(2000)
  })

  test('Homepage load time < 2000ms', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(2000)
  })

  test('Dashboard load time < 2000ms', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/founder/dashboard`, { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(2000)
  })

  test('Profile builder load time < 3000ms', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/founder/profile-builder`, { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000)
  })

  test('Agent workspace load time < 2000ms', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/founder/agents/sage`, { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(2000)
  })
})

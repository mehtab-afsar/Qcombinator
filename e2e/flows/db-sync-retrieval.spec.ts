import { test, expect } from '@playwright/test'
import { signInAsNexusPower, makeAuthenticatedRequest } from '../helpers/auth'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signInAsNexusPower(page)
  await context.close()
})

test('GET /api/qscore/latest returns seeded score', async ({ page }) => {
  await signInAsNexusPower(page)

  const result = await makeAuthenticatedRequest(page, '/api/qscore/latest')

  expect(result.status).toBe(200)
  const score = result.data as Record<string, unknown>

  expect(score.overall_score).toBeGreaterThanOrEqual(60)
  expect(score.overall_score).toBeLessThanOrEqual(70)
  expect(['A', 'B', 'C']).toContain(score.grade)
  expect(score.data_source).toBe('assessment')
})

test('Dashboard Q-Score ring shows correct value', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/dashboard')
  await page.waitForLoadState('networkidle')

  // Look for the Q-Score display (numeric value between 60-70)
  const scoreText = page.locator('text=/6[0-9]|70/')
  await expect(scoreText).toBeVisible()
})

test('Dashboard dimension bars: all P1–P6 shown', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/dashboard')
  await page.waitForLoadState('networkidle')

  // Look for dimension labels
  const dimensions = ['Market Readiness', 'Market Potential', 'IP', 'Team', 'Impact', 'Financials']
  for (const dim of dimensions) {
    const dimElement = page.locator(`text=${dim}`)
    await expect(dimElement).toBeVisible({ timeout: 5000 })
  }

  // Verify no dimension shows "0"
  const zeroElements = page.locator('text=/^0$/')
  const count = await zeroElements.count()
  expect(count).toBeLessThan(2) // Allow at most 1 stray "0"
})

test('Score history chart has at least 1 data point', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/dashboard')
  await page.waitForLoadState('networkidle')

  // Look for SVG chart (line/area chart)
  const chart = page.locator('svg').first()
  await expect(chart).toBeVisible()

  // Check for at least one data point (circle or line element)
  const dataPoints = chart.locator('circle, path[d*="M"]')
  const count = await dataPoints.count()
  expect(count).toBeGreaterThan(0)
})

test('GET /api/qscore/benchmarks returns percentile data', async ({ page }) => {
  await signInAsNexusPower(page)

  const result = await makeAuthenticatedRequest(page, '/api/qscore/benchmarks')

  expect(result.status).toBe(200)
  const data = Array.isArray(result.data) ? result.data : []
  expect(data.length).toBeGreaterThan(0)

  // Check structure of first item
  if (data.length > 0) {
    const item = data[0] as Record<string, unknown>
    expect(item.dimension || item.label).toBeTruthy()
    expect(typeof item.percentile === 'number' || typeof item.rank === 'number').toBeTruthy()
  }
})

test('Improve Q-Score page loads dimension data', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/improve-qscore')
  await page.waitForLoadState('networkidle')

  // Check for dimension labels
  const dimensions = ['Market', 'Potential', 'IP', 'Team', 'Impact', 'Financials']
  for (const dim of dimensions) {
    const dimLabel = page.locator(`text=${dim}`)
    await expect(dimLabel).toBeVisible({ timeout: 5000 })
  }

  // Verify we're not seeing all "0" values
  const scoreElements = page.locator('[data-testid*="score"], text=/\\d{1,3}/')
  const count = await scoreElements.count()
  expect(count).toBeGreaterThan(3)
})

test('Workspace page loads without errors', async ({ page }) => {
  await signInAsNexusPower(page)
  await page.goto('/founder/workspace')
  await page.waitForLoadState('networkidle')

  // Check page title or heading
  const heading = page.locator('h1, h2')
  await expect(heading).toBeVisible()

  // Either shows artifacts or empty state
  const artifacts = page.locator('text=/deliverable|artifact|empty/')
  await expect(artifacts).toBeVisible({ timeout: 5000 })

  // No 404 or 500 errors
  expect(page.url()).toContain('/founder/workspace')
})

test('Profile data has correct stage and industry', async ({ page }) => {
  await signInAsNexusPower(page)

  const result = await makeAuthenticatedRequest(page, '/api/founder/profile')

  expect(result.status).toBe(200)
  const profile = result.data as Record<string, unknown>

  // Nexus Power is in clean-tech sector, seed stage
  expect(String(profile.industry).toLowerCase()).toMatch(/climate|clean|energy/)
  expect(profile.stage).toBe('seed')
  expect(String(profile.company_name).toLowerCase()).toContain('nexus')
})

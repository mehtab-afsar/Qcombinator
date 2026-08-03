/**
 * Every internal href/router.push must point at a route that actually exists.
 *
 * FOUND 4 Aug 2026 by a full sweep, not by tsc or the test suite: a redirect to `/auth/login`
 * (real route: `/login`), three "complete your assessment" CTAs pointing at `/founder/assessment`
 * (real route: `/founder/profile-builder`), a "back to marketplace" link at `/founder/marketplace`
 * (real route: `/founder/matching`), and an investor deal-flow card linking to a nested route
 * that was never built (`/investor/deal-flow/[id]` doesn't exist; the real per-founder page is
 * `/investor/startup/[id]`). None of these are type errors — a string literal is valid TypeScript
 * whether or not a page exists behind it, which is exactly why the adviser-layer deletion left 28
 * of the same class of bug behind on 4 Aug too.
 *
 * This sweeps app/, features/, and components/ once and cross-references every static href against
 * the real route tree (app/**\/page.tsx), so a typo or a renamed route fails a test instead of
 * waiting for someone to click it.
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

function allRoutes(): Set<string> {
  const routes = new Set<string>()
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === 'page.tsx') { routes.add(prefix || '/'); continue }
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}/${entry.name}`)
    }
  }
  walk('app', '')
  return routes
}

function routeMatches(routes: Set<string>, path: string): boolean {
  const clean = path.split('?')[0].split('#')[0]
  if (routes.has(clean)) return true
  const parts = clean.replace(/^\/|\/$/g, '').split('/')
  for (const r of routes) {
    const rParts = r.replace(/^\/|\/$/g, '').split('/')
    if (rParts.length !== parts.length) continue
    if (rParts.every((rp, i) => rp.startsWith('[') || rp === parts[i])) return true
  }
  return false
}

function allSourceFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (['node_modules', '.next', '__tests__', 'test-results'].includes(entry.name)) continue
      const rel = join(dir, entry.name)
      if (entry.isDirectory()) walk(rel)
      else if (entry.name.endsWith('.tsx')) out.push(rel)
    }
  }
  for (const top of ['app', 'features', 'components']) walk(top)
  return out
}

describe('every static internal link points at a route that exists', () => {
  const routes = allRoutes()
  const files = allSourceFiles()

  // href="/x", href='/x', href={`/x`} (no ${} — a genuinely static path just written with
  // backticks), and router.push('/x') / router.replace('/x'). Dynamic template hrefs
  // (href={`/investor/startup/${id}`}) are a separate, harder problem — not swept here.
  const patterns = [
    /href=["']([^"'{}]+)["']/g,
    /href=\{`([^$`]+)`\}/g,
    /router\.(?:push|replace)\(['"]([^'"]+)['"]/g,
  ]

  // /privacy: a real legal document, not a product route — deliberately not built (or faked)
  // here. Tracked as a known gap for Mo, not silently swallowed; a NEW dead link still fails.
  const KNOWN_GAPS = new Set(['/privacy'])

  const broken: Array<{ target: string; file: string }> = []
  for (const file of files) {
    const src = readFileSync(join(ROOT, file), 'utf8')
    for (const pattern of patterns) {
      for (const m of src.matchAll(pattern)) {
        const target = m[1]
        if (!target.startsWith('/') || target.startsWith('/api/')) continue
        if (KNOWN_GAPS.has(target)) continue
        if (!routeMatches(routes, target)) broken.push({ target, file })
      }
    }
  }

  it('found routes to check against (a change here means the sweep itself broke)', () => {
    expect(routes.size).toBeGreaterThan(40)
  })

  it('has no dead internal links', () => {
    if (broken.length > 0) {
      const summary = broken.map(b => `  ${b.target}  ← ${b.file}`).join('\n')
      throw new Error(`Found ${broken.length} link(s) with no matching route:\n${summary}`)
    }
  })
})

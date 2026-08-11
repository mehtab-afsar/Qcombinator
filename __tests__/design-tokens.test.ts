/**
 * The design-consistency audit (4 Aug 2026) found no page/component reinvention was ever
 * caught by anything — CLAUDE.md's own colors.ts comment says "Do NOT redefine these locally in
 * page files," and 94 files ignore it. tsc can't catch this class of bug: a hardcoded hex string
 * is valid TypeScript whether or not it matches the palette. Modeled directly on
 * __tests__/dead-links.test.ts — a source-text scan, no linter, no build step.
 *
 * Every check here is an ALLOWLIST, not a ban. It passes today by naming today's real offenders;
 * it fails only on a NEW one. As pages get migrated to the shared tokens/primitives, remove their
 * path from the allowlist in the same PR — the list should only ever shrink.
 *
 * Not every hex literal in the allowlist is a bug worth fixing. The onboarding doodles and the
 * landing page's building illustration (features/onboarding/components/doodles/**,
 * features/landing/components/building/**) use dozens of bespoke SVG art colors that will never
 * be design tokens — they're illustration, not UI chrome. They're allowlisted honestly rather
 * than pretending this check is a semantic linter it isn't.
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

/**
 * Strip comments so a source scan reads CODE, not prose. Without this, a comment that mentions
 * the very pattern it's warning against (e.g. this file's own "used a raw #fff here") matches
 * itself and fails — the same trap __tests__/executive-command-view.test.ts documents and guards
 * against for the same reason.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n')
}

function readCode(path: string): string {
  return stripComments(readFileSync(join(ROOT, path), 'utf8'))
}

function allTsxFiles(dirs: string[]): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries
    try { entries = readdirSync(join(ROOT, dir), { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const rel = join(dir, entry.name)
      if (entry.isDirectory()) walk(rel)
      else if (entry.name.endsWith('.tsx')) out.push(rel)
    }
  }
  for (const d of dirs) walk(d)
  return out
}

// ─── Check 1: raw hex literals outside the token files ──────────────────────────────────────

// Seeded from the real state on 4 Aug 2026 (94 files) — see the file docstring for why several
// of these (doodles, the landing building illustration) are legitimate art, not chrome, and are
// not expected to ever leave this list.
const HEX_ALLOWLIST = new Set([
  'app/admin/metrics/page.tsx', 'app/admin/qscore/thresholds/page.tsx',
  'app/auth/confirm-email/page.tsx', 'app/error.tsx',
  'app/founder/academy/page.tsx',
  'app/founder/assets/[id]/page.tsx', 'app/founder/billing/page.tsx',
  'app/founder/dashboard/page.tsx', 'app/founder/getting-started/page.tsx',
  'app/founder/improve-qscore/page.tsx', 'app/founder/join/page.tsx',
  'app/founder/layout.tsx', 'app/founder/matching/page.tsx',
  'app/founder/messages/page.tsx', 'app/founder/metrics/page.tsx',
  'app/founder/onboarding/page.tsx', 'app/founder/page.tsx',
  'app/founder/portfolio/page.tsx', 'app/founder/profile-builder/page.tsx',
  'app/founder/settings/page.tsx',
  'app/founder/verify-email/page.tsx', 'app/investor/verify-email/page.tsx', 'app/getting-started/page.tsx',
  'app/global-error.tsx', 'app/investor/ai-analysis/page.tsx',
  'app/investor/billing/page.tsx', 'app/investor/dashboard/page.tsx',
  'app/investor/deal-flow/page.tsx', 'app/investor/getting-started/page.tsx',
  'app/investor/join/page.tsx', 'app/investor/messages/page.tsx',
  'app/investor/onboarding/page.tsx', 'app/investor/portfolio-companies/page.tsx',
  'app/investor/settings/page.tsx', 'app/investor/settings/preferences/page.tsx',
  'app/investor/startup/[id]/page.tsx', 'app/library/page.tsx',
  'app/login/page.tsx', 'app/not-found.tsx',
  'app/opengraph-image.tsx', 'app/p/[userId]/page.tsx', 'app/pitch/[userId]/page.tsx',
  'app/q/[userId]/page.tsx', 'app/reset-password/page.tsx', 'app/s/[surveyId]/page.tsx',
  'app/startup/[slug]/page.tsx', 'app/update-password/page.tsx',
  'features/academy/components/DayWorkshopPanel.tsx',
  'features/founder/components/FounderSidebar.tsx',
  'features/investor/components/InvestorSidebar.tsx',
  'features/investor/components/UpgradeModal.tsx',
  'features/landing/components/Agents.tsx',
  'features/landing/components/building/CityBackdrop.tsx',
  'features/landing/components/building/Crane.tsx',
  'features/landing/components/building/GodRays.tsx',
  'features/landing/components/building/HeroBuilding.tsx',
  'features/landing/components/Hero.tsx', 'features/landing/components/Nav.tsx',
  'features/landing/components/Pricing.tsx',
  'features/matching/components/ConnectionRequestModal.tsx',
  'features/matching/components/ConnectionStatusBadge.tsx',
  'features/onboarding/components/doodles/CameraDoodle.tsx',
  'features/onboarding/components/doodles/ChartDoodle.tsx',
  'features/onboarding/components/doodles/CompassDoodle.tsx',
  'features/onboarding/components/doodles/IdCardDoodle.tsx',
  'features/onboarding/components/doodles/LightbulbDoodle.tsx',
  'features/onboarding/components/doodles/RocketDoodle.tsx',
  'features/onboarding/components/doodles/ScoutDoodle.tsx',
  'features/onboarding/components/doodles/ScrollDoodle.tsx',
  'features/onboarding/components/doodles/SunDoodle.tsx',
  'features/onboarding/components/doodles/TargetDoodle.tsx',
  'features/onboarding/components/ProcessingScreen.tsx',
  'features/onboarding/components/StepProgress.tsx',
  'features/onboarding/components/ui/SelectCard.tsx',
  'features/qscore/components/QScoreDial.tsx',
  'features/shared/components/Badge.tsx',
  'features/shared/components/EmailConfirmBanner.tsx',
  'features/shared/components/FileUploadArea.tsx',
  'features/shared/components/MessageBubble.tsx',
  'features/shared/components/NotificationPanel.tsx',
  'features/shared/components/Skeleton.tsx',
  'features/shared/components/Spinner.tsx',
  'features/shared/components/StatCard.tsx',
  'features/shared/components/Toast.tsx',
])

describe('no NEW file hardcodes a raw hex color outside the token files', () => {
  const files = allTsxFiles(['app', 'features'])
  const hexPattern = /#[0-9A-Fa-f]{3,8}\b/

  it('found files to check (a change here means the sweep itself broke)', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('has no hex literal outside the allowlist', () => {
    const violators = files.filter(f => {
      if (HEX_ALLOWLIST.has(f)) return false
      return hexPattern.test(readCode(f))
    })
    if (violators.length > 0) {
      throw new Error(
        `New file(s) hardcoding a hex color instead of importing lib/constants/colors.ts or ` +
        `features/shared/tokens.ts:\n${violators.map(v => `  ${v}`).join('\n')}`
      )
    }
  })
})

// ─── Check 2: local palette redeclarations ───────────────────────────────────────────────────

const PALETTE_REDECLARATION_ALLOWLIST = new Set([
  'app/founder/join/page.tsx',
  'app/founder/billing/page.tsx',
  'app/investor/join/page.tsx',
  'app/investor/billing/page.tsx',
])

describe('no NEW file redeclares a local color palette instead of importing one', () => {
  const files = allTsxFiles(['app', 'features'])
  // The exact shape found twice in the audit: `const C = { ... }` as a local palette object, or
  // redeclaring a canonical token name (bdr/surf) as a raw hex instead of importing it.
  const pattern = /const C = \{|const bdr = ['"]#|const surf = ['"]#/

  it('has no local palette redeclaration outside the allowlist', () => {
    const violators = files.filter(f => {
      if (PALETTE_REDECLARATION_ALLOWLIST.has(f)) return false
      return pattern.test(readCode(f))
    })
    if (violators.length > 0) {
      throw new Error(
        `New file(s) redeclaring a local palette instead of importing lib/constants/colors.ts:\n` +
        violators.map(v => `  ${v}`).join('\n')
      )
    }
  })
})

// ─── Check 3: hand-rolled @keyframes spin ────────────────────────────────────────────────────

describe('no NEW file redeclares @keyframes spin — app/globals.css already defines it globally', () => {
  const files = allTsxFiles(['app', 'features'])
  const KNOWN_COUNT = 17 // seeded 4 Aug 2026 — see the file docstring

  it('does not exceed the known count of local @keyframes spin declarations', () => {
    const violators = files.filter(f => readCode(f).includes('@keyframes spin'))
    if (violators.length > KNOWN_COUNT) {
      throw new Error(
        `${violators.length} files redeclare @keyframes spin, expected at most ${KNOWN_COUNT}. ` +
        `app/globals.css already defines this globally — use it instead of a local <style> tag:\n` +
        violators.map(v => `  ${v}`).join('\n')
      )
    }
  })
})

// ─── Check 4: the verify-email sidebar-exemption regression guard ───────────────────────────

describe('the email-verification block screen stays exempt from the sidebar shell', () => {
  it('app/founder/layout.tsx still excludes /verify-email from the sidebar wrapper', () => {
    // Regression guard for the bug found 4 Aug 2026: a founder blocked by email verification
    // could see the full sidebar/nav around the block screen and click their way around it.
    const src = readCode('app/founder/layout.tsx')
    expect(src).toMatch(/hideSidebar[\s\S]{0,400}verify-email/)
  })

  it('app/investor/layout.tsx excludes /verify-email from the sidebar wrapper too', () => {
    // Same bug class, investor side — the investor gate didn't exist at all until the
    // Supabase-native email confirmation switch, so there was nothing to guard before.
    const src = readCode('app/investor/layout.tsx')
    expect(src).toMatch(/hideSidebar[\s\S]{0,400}verify-email/)
  })
})

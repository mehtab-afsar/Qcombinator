/**
 * Create stable dev accounts for local testing.
 *
 * Founder:  Test@123  / Test@123
 * Investor: Test@1234 / Test@1234
 *
 * Run: npx tsx scripts/create-dev-accounts.ts
 *
 * Idempotent — safe to run multiple times. Existing accounts are skipped.
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Accounts ────────────────────────────────────────────────────────────────

const FOUNDER = {
  email:    'Test@123',
  password: 'Test@123',
  fullName: 'Test Founder',
  company:  'TestCo',
  industry: 'b2b_saas',
  stage:    'mvp',
}

const INVESTOR = {
  email:    'Test@1234',
  password: 'Test@1234',
  fullName: 'Test Investor',
  firm:     'Test Ventures',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

async function upsertAuthUser(email: string, password: string, meta: Record<string, string>) {
  // Try to create — if already exists, find and return them
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  })
  if (!error) return data.user.id

  if (error.message.includes('already been registered') || error.message.includes('already exists')) {
    // Query auth.users directly via REST admin endpoint
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (res.ok) {
      const body = await res.json() as { users?: Array<{ id: string; email: string }> }
      const found = body.users?.find(u => u.email === email)
      if (found) {
        console.log(`  ↳ auth user already exists (${email})`)
        return found.id
      }
    }
    throw new Error(`User exists but could not be found: ${email}`)
  }
  throw new Error(`Auth user creation failed: ${error.message}`)
}

// ─── Create Founder ───────────────────────────────────────────────────────────

async function createFounder() {
  console.log('\n── Founder ──────────────────────────────────────────')
  console.log(`   Email:    ${FOUNDER.email}`)
  console.log(`   Password: ${FOUNDER.password}`)

  const userId = await upsertAuthUser(FOUNDER.email, FOUNDER.password, {
    role: 'founder', full_name: FOUNDER.fullName,
  })

  // founder_profiles
  const { data: existing } = await admin
    .from('founder_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    console.log('  ↳ founder_profiles already exists — skipping')
  } else {
    const startupName = `${FOUNDER.company}-${userId.slice(0, 6)}`
    const { error } = await admin.from('founder_profiles').insert({
      user_id:                  userId,
      full_name:                FOUNDER.fullName,
      startup_name:             startupName,
      company_name:             FOUNDER.company,
      founder_name:             FOUNDER.fullName,
      industry:                 FOUNDER.industry,
      stage:                    FOUNDER.stage,
      role:                     'founder',
      subscription_tier:        'enterprise',
      onboarding_completed:     true,
      assessment_completed:     false,
      registration_completed:   true,
      profile_builder_completed: false,
      tagline:                  'AI that sells for your sales team',
      location:                 'San Francisco, CA',
      startup_profile_data: {
        problemStatement: 'Sales teams waste 40% of their time on manual CRM updates instead of selling.',
        targetCustomer:   'VP of Sales at B2B SaaS companies with 50–200 employees',
      },
    })
    if (error) throw new Error(`founder_profiles insert failed: ${error.message}`)
    console.log('  ✓ founder_profiles created')

    // initial Q-Score row
    await admin.from('qscore_history').insert({
      user_id:       userId,
      overall_score: 42,
      p1_score:      38,
      p2_score:      45,
      p3_score:      30,
      p4_score:      55,
      p5_score:      40,
      p6_score:      35,
      data_source:   'registration',
    })
    console.log('  ✓ qscore_history created (score: 42)')

    // usage limits
    await admin.from('subscription_usage').insert([
      { user_id: userId, feature: 'agent_chat',          usage_count: 0, limit_count: 999, reset_at: nextMonth() },
      { user_id: userId, feature: 'qscore_recalc',       usage_count: 0, limit_count: 99,  reset_at: nextMonth() },
      { user_id: userId, feature: 'investor_connection',  usage_count: 0, limit_count: 99,  reset_at: nextMonth() },
    ])
    console.log('  ✓ subscription_usage created')
  }

  console.log(`\n  ✅ Founder ready — log in at /login`)
  console.log(`     ${FOUNDER.email}  /  ${FOUNDER.password}`)
}

// ─── Create Investor ──────────────────────────────────────────────────────────

async function createInvestor() {
  console.log('\n── Investor ─────────────────────────────────────────')
  console.log(`   Email:    ${INVESTOR.email}`)
  console.log(`   Password: ${INVESTOR.password}`)

  const userId = await upsertAuthUser(INVESTOR.email, INVESTOR.password, {
    role: 'investor', full_name: INVESTOR.fullName, fund_name: INVESTOR.firm,
  })

  const { data: existing } = await admin
    .from('investor_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    console.log('  ↳ investor_profiles already exists — skipping')
  } else {
    const { error } = await admin.from('investor_profiles').insert({
      user_id:              userId,
      full_name:            INVESTOR.fullName,
      email:                INVESTOR.email,
      firm_name:            INVESTOR.firm,
      firm_type:            'vc',
      title:                'General Partner',
      check_sizes:          ['$100K–$500K', '$500K–$2M'],
      stages:               ['pre-seed', 'seed', 'mvp'],
      sectors:              ['ai_ml', 'b2b_saas', 'fintech'],
      thesis:               `${INVESTOR.firm} invests in early-stage B2B software companies solving measurable enterprise pain points. We focus on founders who have deep domain expertise and at least one design partner with budget to pay.`,
      subscription_tier:    'pro',
      onboarding_completed: true,
      response_rate:        72,
    })
    if (error) throw new Error(`investor_profiles insert failed: ${error.message}`)
    console.log('  ✓ investor_profiles created')
  }

  console.log(`\n  ✅ Investor ready — log in at /login`)
  console.log(`     ${INVESTOR.email}  /  ${INVESTOR.password}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Creating dev accounts...')
  try {
    await createFounder()
    await createInvestor()
    console.log('\n✅  Done.\n')
  } catch (err) {
    console.error('\n❌ ', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()

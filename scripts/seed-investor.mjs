/**
 * Seed script — creates an investor demo account
 *
 * Run:  node scripts/seed-investor.mjs
 *
 * Requires env vars:
 *   SUPABASE_URL             (defaults to local http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY is required'); process.exit(1) }

const EMAIL    = 'mehtabafsar666@gmail.com'
const PASSWORD = 'Moon@123'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ok   = (label, data) => console.log(`  ✓ ${label}`, data?.id ?? '')
const fail = (label, err)  => { console.error(`  ✗ ${label}`, err?.message ?? err); process.exit(1) }

// ─── 1. Auth user ─────────────────────────────────────────────────────────────

console.log('\n── Creating auth user ──')
const { data: listData } = await admin.auth.admin.listUsers()
const existing = listData?.users?.find(u => u.email === EMAIL)
if (existing) {
  console.log(`  ⚠  User already exists (${existing.id}) — deleting and recreating`)
  await admin.auth.admin.deleteUser(existing.id)
}

const { data: authData, error: authErr } = await admin.auth.admin.createUser({
  email:         EMAIL,
  password:      PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: 'Mohammed Mehtab Afsar' },
})
if (authErr) fail('createUser', authErr)
const userId = authData.user.id
ok('auth user created', { id: userId })

// ─── 2. Investor profile ──────────────────────────────────────────────────────

console.log('\n── Creating investor profile ──')
const { data: profile, error: profileErr } = await admin
  .from('investor_profiles')
  .insert({
    user_id:              userId,
    full_name:            'Mohammed Mehtab Afsar',
    email:                EMAIL,
    phone:                '+44 7700 900000',
    linkedin_url:         'https://linkedin.com/in/mehtabafsar',
    firm_name:            'Afsar Capital',
    firm_type:            'angel',
    firm_size:            '1-5',
    aum:                  '<10m',
    website:              'https://afsar.capital',
    location:             'London, UK',
    check_sizes:          ['$100K-$500K', '$500K-$1M'],
    stages:               ['Pre-Seed', 'Seed'],
    sectors:              ['AI/ML', 'SaaS', 'Consumer'],
    geography:            ['Europe', 'North America'],
    thesis:               'Backing early-stage founders who combine deep domain expertise with product instinct — particularly AI-native tools that create defensible data moats.',
    deal_flow_strategy:   'Inbound through networks and platforms like Qcombinator. I prioritise founders who have talked to 50+ customers before writing a line of code.',
    decision_process:     '2-4weeks',
    monthly_deal_volume:  '6-15',
    onboarding_completed: true,
    verified:             true,
    verification_status:  'verified',
  })
  .select()
  .single()
if (profileErr) fail('investor_profiles insert', profileErr)
ok('investor_profiles', profile)

// ─── 3. Subscription usage ────────────────────────────────────────────────────

console.log('\n── Creating subscription usage ──')
const nextMonth = new Date()
nextMonth.setMonth(nextMonth.getMonth() + 1)
nextMonth.setDate(1)
nextMonth.setHours(0, 0, 0, 0)

const { error: usageErr } = await admin.from('subscription_usage').insert({
  user_id:     userId,
  feature:     'agent_chat',
  usage_count: 0,
  limit_count: null,   // null = unlimited for investors
  reset_at:    nextMonth.toISOString(),
})
if (usageErr) fail('subscription_usage', usageErr)
ok('subscription_usage: agent_chat (unlimited)')

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Investor seed complete

  Login:    ${EMAIL}
  Password: ${PASSWORD}

  Name:     Mohammed Mehtab Afsar
  Firm:     Afsar Capital  (Angel investor)
  Location: London, UK

  Check sizes: $100K–$500K, $500K–$1M
  Stages:      Pre-Seed, Seed
  Sectors:     AI/ML, SaaS, Consumer
  Geography:   Europe, North America

  Status:  verified ✓  |  onboarding completed ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

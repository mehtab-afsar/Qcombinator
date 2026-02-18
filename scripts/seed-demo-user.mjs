/**
 * Seed script — creates the Cohere.ai demo user and populates all tables
 * so the full dashboard, agents, matching, and assessment screens
 * are populated with realistic data.
 *
 * Run:  node scripts/seed-demo-user.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY

const EMAIL    = 'mehtabafsar346@gmail.com'
const PASSWORD = 'Moon@123'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── helpers ──────────────────────────────────────────────────────────────────

const ok = (label, data) => console.log(`  ✓ ${label}`, data?.id ?? '')
const fail = (label, err) => { console.error(`  ✗ ${label}`, err.message); process.exit(1) }

// ─── 1. Auth user ─────────────────────────────────────────────────────────────

console.log('\n── Creating auth user ──')
const existingUsers = await admin.auth.admin.listUsers()
const existing = existingUsers.data?.users?.find(u => u.email === EMAIL)
if (existing) {
  console.log(`  ⚠  User already exists (${existing.id}) — deleting and recreating`)
  await admin.auth.admin.deleteUser(existing.id)
}

const { data: authData, error: authErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: 'Mohammed Mehtab Afsar' },
})
if (authErr) fail('createUser', authErr)
const userId = authData.user.id
ok('auth user created', { id: userId })

// ─── 2. Founder profile ───────────────────────────────────────────────────────

console.log('\n── Creating founder profile ──')
const { data: profile, error: profileErr } = await admin
  .from('founder_profiles')
  .insert({
    user_id:              userId,
    full_name:            'Mohammed Mehtab Afsar',
    startup_name:         'Cohere.ai',
    industry:             'AI / Behavioral Health',
    stage:                'mvp',
    funding:              'pre-seed',
    time_commitment:      '15-mins',
    role:                 'founder',
    subscription_tier:    'premium',
    onboarding_completed: true,
    assessment_completed: true,
    tagline:              'AI-powered behavioral habit planner that adapts to how your brain works',
    bio:                  'Former ML engineer at Spotify. Obsessed with behavioural science and why 80% of habit apps fail their users.',
    location:             'London, UK',
    website:              'https://cohere.ai',
  })
  .select()
  .single()
if (profileErr) fail('founder_profiles insert', profileErr)
ok('founder_profiles', profile)

// ─── 3. Assessment data ───────────────────────────────────────────────────────

console.log('\n── Creating assessment ──')
const assessmentData = {
  // Section 1 — Problem Origin
  problemStory: `Most habit apps give everyone the same generic plan — run 5km, meditate 10 mins. But human behaviour doesn't work that way. I struggled with consistency for years, then realised the obstacle wasn't motivation — it was that the plan never accounted for my specific behavioural patterns (perfectionism, decision fatigue). That's the gap Cohere.ai fills.`,
  problemDuration: '3 years',
  problemValidation: 'Interviewed 200+ people who abandoned habit apps within 30 days',

  // Section 2 — Market
  tam: '2.8B',
  sam: '480M',
  som: '24M',
  marketGrowth: '28% YoY — global behavioral health tech market',
  marketTiming: 'Post-COVID mental wellness boom + LLMs making personalization cheap for the first time',

  // Section 3 — Unique Advantage
  uniqueAdvantage: 'Stone-aware delivery layer — we classify each user\'s primary behavioural obstacle (perfectionism, procrastination, fear of failure) and adapt every task\'s framing, timing, and structure accordingly. 5-agent AI pipeline does this in real-time.',
  moat: 'Proprietary stone taxonomy trained on 10,000+ habit failure interviews. Competitors use one-size-fits-all delivery.',
  ip: 'Stone classification algorithm (patent pending)',

  // Section 4 — Customer Evidence
  earlyCustomers: '3,400 beta users across iOS and web',
  customerQuotes: '"Finally a habit app that gets me" — user review. 4.8★ on App Store (240 reviews)',
  retention: '68% Day-30 retention vs 12% industry average',
  nps: '71',

  // Section 5 — Learning Velocity
  pivots: 'Started as a general productivity app. Pivoted to pure habit layer after discovery that users failed at task management, not task selection.',
  experiments: '12 major product experiments in 8 months. A/B tested stone delivery rules extensively.',
  productVelocity: 'Ship every Tuesday. 3-person team.',

  // Section 6 — Resilience
  biggestChallenge: 'Lost our first lead investor the week before signing. Rebuilt pipeline in 3 weeks and found a better-fit syndicate.',
  resilience: 'Bootstrapped for 14 months before raising a $180k angel round.',
  motivation: 'Watched my co-founder struggle with anxiety-driven procrastination for years. This is personal.',

  // Section 7 — GTM
  icp: 'Knowledge workers 25-40, high-achievers with executive dysfunction tendencies. Primary: product managers, founders, consultants.',
  channels: ['Content/SEO', 'Product-led growth', 'Partnerships'],
  gtmResults: 'SEO driving 1,200 organic signups/month. PLG referral loop converting at 18%.',
  cac: '$4.20 blended CAC',
  targetCac: '$8.00 target LTV:CAC of 8:1',

  // Section 8 — Financials
  mrr: '$12,400',
  arr: '$148,800',
  burnRate: '$18,000/month',
  runway: '11 months',
  unitEconomics: 'LTV $67, CAC $4.20, LTV:CAC 16:1',
  projectedArr12m: '$580,000',
  revenueModel: 'Freemium → $9.99/mo Pro ($29.99/mo Coach tier launching Q2)',
}

const { data: assessment, error: assessErr } = await admin
  .from('qscore_assessments')
  .insert({
    user_id:       userId,
    assessment_data: assessmentData,
    status:        'scored',
    submitted_at:  new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
  })
  .select()
  .single()
if (assessErr) fail('qscore_assessments insert', assessErr)
ok('assessment', assessment)

// ─── 4. Q-Score history — two entries to show delta ──────────────────────────

console.log('\n── Creating Q-Score history ──')

// Entry 1 — 4 weeks ago (before working with agents)
const { data: prevScore, error: prevErr } = await admin
  .from('qscore_history')
  .insert({
    user_id:        userId,
    assessment_id:  assessment.id,
    overall_score:  63,
    percentile:     48,
    grade:          'C+',
    market_score:   72,
    product_score:  76,
    gtm_score:      55,
    financial_score: 47,
    team_score:     68,
    traction_score: 52,
    calculated_at:  new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  })
  .select()
  .single()
if (prevErr) fail('qscore_history (previous)', prevErr)
ok('Q-Score (prev, 4 weeks ago): 63', prevScore)

// Entry 2 — current score, linked to previous via previous_score_id
const { data: currentScore, error: curErr } = await admin
  .from('qscore_history')
  .insert({
    user_id:          userId,
    assessment_id:    assessment.id,
    previous_score_id: prevScore.id,
    overall_score:    72,
    percentile:       67,
    grade:            'B',
    market_score:     80,
    product_score:    84,
    gtm_score:        65,
    financial_score:  58,
    team_score:       76,
    traction_score:   66,
    calculated_at:    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  })
  .select()
  .single()
if (curErr) fail('qscore_history (current)', curErr)
ok('Q-Score (current): 72 (+9)', currentScore)

// ─── 5. Agent conversations + messages ───────────────────────────────────────

console.log('\n── Creating agent conversations ──')

const conversations = [
  {
    agent_id: 'patel',
    title: 'GTM channel strategy for PLG',
    last_message_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    message_count: 14,
    messages: [
      { role: 'assistant', content: "Welcome! I'm Patel. I focus on Go-to-Market strategy. I've looked at your Q-Score — your GTM dimension is at 65, which is decent but there's clear room to grow. What's your current primary acquisition channel?" },
      { role: 'user',      content: "Mostly SEO and some word of mouth. We're getting about 1,200 organic signups a month but I'm not sure how to scale beyond that." },
      { role: 'assistant', content: "1,200 organic signups with a $4.20 CAC is genuinely impressive for a pre-seed startup — you've found a signal. The question now is whether to pour fuel on SEO or open a second channel before you raise. What's your conversion rate from free signup to paid?" },
      { role: 'user',      content: "About 6.2% convert to Pro within 30 days." },
      { role: 'assistant', content: "6.2% is good. Industry benchmark for PLG is 3-8%, so you're in the top half. Here's the decision I'd push you to make: SEO scales slowly — it compounds over 6-12 months. If you're raising in the next 6 months, you need a faster-moving channel to show growth acceleration in the metrics. Have you tested any outbound to product managers or consultants directly?" },
      { role: 'user',      content: "Not really. I was worried outbound would feel too pushy for a consumer-ish product." },
      { role: 'assistant', content: "That's a common misconception. You're not selling to consumers — your ICP is knowledge workers at companies. A warm outbound sequence to PMs on LinkedIn, framed around the stat that 80% of habit apps fail within 30 days, would feel like a service, not a pitch. I'd run 200 personalised DMs as an experiment this week. What's stopping you from testing that this week?" },
    ],
  },
  {
    agent_id: 'felix',
    title: 'Unit economics and fundraise prep',
    last_message_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    message_count: 10,
    messages: [
      { role: 'assistant', content: "Hi, I'm Felix — I focus on financial modelling and fundraise prep. Your financial score is 58, which is the lowest of your six dimensions. Let's fix that. First question: have you built a proper 12-month financial model, or are you working from a spreadsheet with rough projections?" },
      { role: 'user',      content: "Spreadsheet with rough projections honestly. Revenue, burn, headcount. Nothing too sophisticated." },
      { role: 'assistant', content: "That's the norm at your stage, but it becomes a problem in investor conversations. VCs will probe your assumptions, and if you can't walk them through the model in real-time, it signals financial immaturity. What's your current burn, and how does it break down between people and tools?" },
      { role: 'user',      content: "$18k/month. About $14k is salaries (3 people, I take minimal salary), $4k is cloud infra and tools." },
      { role: 'assistant', content: "Strong discipline on personal salary — that's a green flag for investors. £14k for 3 people in London is lean. Your LTV:CAC of 16:1 is exceptional — most investors look for 3:1 minimum. That number needs to be on slide 2 of your deck. Are you tracking churn properly, and do you have monthly cohort data?" },
      { role: 'user',      content: "We track it monthly. Churn is about 4.8% monthly." },
      { role: 'assistant', content: "4.8% monthly churn translates to roughly 45% annual churn — that's on the high side for a subscription product. Your D-30 retention is 68% which contradicts this slightly, so let's untangle it. Are users churning after month 1 predominantly, or is it distributed across months?" },
    ],
  },
  {
    agent_id: 'nova',
    title: 'Product-market fit signals',
    last_message_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    message_count: 8,
    messages: [
      { role: 'assistant', content: "I'm Nova — I work on product-market fit. Your product score is 84, which is the highest dimension on your profile. That tells me you've built something people genuinely want. My question is: can you point to one moment in the product where users feel the 'aha'? What's the event that correlates most strongly with long-term retention?" },
      { role: 'user',      content: "When a user completes their first full 7-day stone plan without breaking the streak. That's the moment churn drops dramatically." },
      { role: 'assistant', content: "That's a very specific, measurable activation event — exactly what investors want to hear. What percentage of new signups reach that moment within their first 14 days?" },
      { role: 'user',      content: "About 31% right now." },
      { role: 'assistant', content: "31% is meaningful but has headroom. The question is: what happens between signup and that moment? Walk me through the onboarding flow — where do people drop out before reaching their first completed stone plan?" },
    ],
  },
]

for (const conv of conversations) {
  const { data: convRow, error: convErr } = await admin
    .from('agent_conversations')
    .insert({
      user_id:         userId,
      agent_id:        conv.agent_id,
      title:           conv.title,
      last_message_at: conv.last_message_at,
      message_count:   conv.message_count,
    })
    .select()
    .single()
  if (convErr) fail(`agent_conversations (${conv.agent_id})`, convErr)
  ok(`conversation: ${conv.agent_id}`, convRow)

  for (const msg of conv.messages) {
    const { error: msgErr } = await admin
      .from('agent_messages')
      .insert({
        conversation_id: convRow.id,
        role:            msg.role,
        content:         msg.content,
      })
    if (msgErr) fail(`agent_messages (${conv.agent_id})`, msgErr)
  }
  console.log(`     → ${conv.messages.length} messages seeded`)
}

// ─── 6. Subscription usage ────────────────────────────────────────────────────

console.log('\n── Creating subscription usage ──')
const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1)
const usages = [
  { feature: 'agent_chat',          usage_count: 32, limit_count: null },  // premium = unlimited
  { feature: 'qscore_recalc',       usage_count: 2,  limit_count: null },
  { feature: 'investor_connection', usage_count: 3,  limit_count: null },
]
for (const u of usages) {
  const { error } = await admin.from('subscription_usage').insert({
    user_id:    userId,
    feature:    u.feature,
    usage_count: u.usage_count,
    limit_count: u.limit_count,
    reset_at:   nextMonth.toISOString(),
  })
  if (error) fail(`subscription_usage (${u.feature})`, error)
  ok(`usage: ${u.feature} (${u.usage_count} uses)`)
}

// ─── 7. Analytics events ──────────────────────────────────────────────────────

console.log('\n── Seeding analytics events ──')
const events = [
  { event_type: 'onboarding_completed',  event_data: { step: 'score_reveal' },            days_ago: 28 },
  { event_type: 'assessment_submitted',  event_data: { score: 63 },                        days_ago: 28 },
  { event_type: 'agent_chat_started',    event_data: { agent_id: 'nova' },                 days_ago: 20 },
  { event_type: 'agent_chat_started',    event_data: { agent_id: 'felix' },                days_ago: 17 },
  { event_type: 'agent_chat_started',    event_data: { agent_id: 'patel' },                days_ago: 14 },
  { event_type: 'assessment_submitted',  event_data: { score: 72, improved_by: 9 },        days_ago: 2  },
  { event_type: 'marketplace_visited',   event_data: { investors_viewed: 8 },              days_ago: 1  },
  { event_type: 'connection_request_sent', event_data: { investor: 'Apex Ventures' },      days_ago: 1  },
]
for (const ev of events) {
  const { error } = await admin.from('analytics_events').insert({
    user_id:    userId,
    event_type: ev.event_type,
    event_data: ev.event_data,
    created_at: new Date(Date.now() - ev.days_ago * 24 * 60 * 60 * 1000).toISOString(),
  })
  if (error) fail(`analytics_event (${ev.event_type})`, error)
  ok(`event: ${ev.event_type}`)
}

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅  Seed complete

  Login:    ${EMAIL}
  Password: ${PASSWORD}

  Startup:  Cohere.ai
  Stage:    MVP · Pre-seed
  Industry: AI / Behavioral Health

  Q-Score:  72 / 100  (B grade, 67th percentile)
  Previous: 63 (+9 improvement shown on dashboard)

  Dimensions:
    Market    80  (+8)
    Product   84  (+8)   ← strongest dimension
    GTM       65  (+10)
    Financial 58  (+11)  ← lowest (improvement target)
    Team      76  (+8)
    Traction  66  (+14)

  Agent convos: Patel (GTM) · Felix (Finance) · Nova (Product)
  Assessment:   scored ✓
  Marketplace:  unlocked (score ≥ 65) ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

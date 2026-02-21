-- ============================================================
-- Supabase Seed File
-- Runs automatically on: supabase db reset
--
-- Creates demo user:
--   Email:    mehtabafsar346@gmail.com
--   Password: Moon@123
--   Startup:  Cohere.ai (behavioral AI habit planner, MVP stage)
-- ============================================================

-- Enable pgcrypto for password hashing (already on in Supabase local)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Fixed UUIDs so all foreign keys are consistent ────────────────────────────
-- Changing these will break the FK chain below.
DO $$
DECLARE
  v_user_id          UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  v_assessment_id    UUID := 'b1ffcd00-0d1c-4fa9-bc7e-7cc0ce491b22';
  v_prev_score_id    UUID := 'c2aade11-1e2d-4ab0-ad8f-8dd1df502c33';
  v_curr_score_id    UUID := 'd3bbef22-2f3e-4bc1-be9a-9ee2ef613d44';
  v_conv_patel_id    UUID := 'e4ccfa33-3a4f-4cd2-cfab-aff3fa724e55';
  v_conv_felix_id    UUID := 'f5ddab44-4b5a-4de3-dab1-baa4ab835f66';
  v_conv_nova_id     UUID := 'a6eebc55-5c6b-4ef4-ebcd-cbb5bc946a77';
BEGIN

-- ── 1. Auth user ──────────────────────────────────────────────────────────────
-- Delete existing demo user first (idempotent)
DELETE FROM auth.users WHERE email = 'mehtabafsar346@gmail.com';

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, email_change,
  phone, phone_change
) VALUES (
  v_user_id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'mehtabafsar346@gmail.com',
  crypt('Moon@123', gen_salt('bf', 10)),  -- cost 10 required by Supabase GoTrue
  NOW(),
  '{"full_name": "Mohammed Mehtab Afsar", "startup_name": "Cohere.ai"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false,
  NOW(),
  NOW(),
  '', '',
  '', '', '',
  '', ''
);

-- auth.identities row (required for email/password login in Supabase local)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  v_user_id,
  v_user_id,
  'mehtabafsar346@gmail.com',
  'email',
  jsonb_build_object(
    'sub',   v_user_id::text,
    'email', 'mehtabafsar346@gmail.com',
    'email_verified', true
  ),
  NOW(), NOW(), NOW()
);

-- ── 2. Founder profile ────────────────────────────────────────────────────────
INSERT INTO founder_profiles (
  user_id, full_name, startup_name, industry, stage, funding,
  time_commitment, role, subscription_tier,
  onboarding_completed, assessment_completed,
  tagline, bio, location, website
) VALUES (
  v_user_id,
  'Mohammed Mehtab Afsar',
  'Cohere.ai',
  'AI / Behavioral Health',
  'mvp',
  'pre-seed',
  '15-mins',
  'founder',
  'premium',
  true,
  true,
  'AI-powered behavioral habit planner that adapts to how your brain works',
  'Former ML engineer at Spotify. Obsessed with behavioural science and why 80% of habit apps fail their users.',
  'London, UK',
  'https://cohere.ai'
);

-- ── 3. Assessment ─────────────────────────────────────────────────────────────
INSERT INTO qscore_assessments (
  id, user_id, assessment_data, status, submitted_at
) VALUES (
  v_assessment_id::uuid,
  v_user_id,
  '{
    "problemStory": "Most habit apps give everyone the same generic plan. I struggled with consistency for years, then realised the obstacle was never motivation — it was that no plan ever accounted for my specific behavioural patterns (perfectionism, decision fatigue). That is the gap Cohere.ai fills.",
    "problemDuration": "3 years",
    "problemValidation": "Interviewed 200+ people who abandoned habit apps within 30 days",
    "tam": "2.8B",
    "sam": "480M",
    "som": "24M",
    "marketGrowth": "28% YoY — global behavioral health tech market",
    "marketTiming": "Post-COVID mental wellness boom + LLMs making personalisation cheap for the first time",
    "uniqueAdvantage": "Stone-aware delivery layer — classifies each user primary behavioural obstacle and adapts every task framing, timing, and structure. 5-agent AI pipeline runs in real-time.",
    "moat": "Proprietary stone taxonomy. Competitors use one-size-fits-all delivery.",
    "ip": "Stone classification algorithm (patent pending)",
    "earlyCustomers": "3,400 beta users across iOS and web",
    "customerQuotes": "Finally a habit app that gets me — 4.8 stars on App Store (240 reviews)",
    "retention": "68% Day-30 retention vs 12% industry average",
    "nps": "71",
    "pivots": "Started as a general productivity app. Pivoted to pure habit layer after discovery that users failed at task management, not task selection.",
    "experiments": "12 major product experiments in 8 months",
    "productVelocity": "Ship every Tuesday. 3-person team.",
    "biggestChallenge": "Lost our first lead investor the week before signing. Rebuilt pipeline in 3 weeks.",
    "resilience": "Bootstrapped for 14 months before raising a 180k angel round.",
    "motivation": "Watched my co-founder struggle with anxiety-driven procrastination for years. This is personal.",
    "icp": "Knowledge workers 25-40, high-achievers with executive dysfunction. Primary: product managers, founders, consultants.",
    "channels": ["Content/SEO", "Product-led growth", "Partnerships"],
    "gtmResults": "SEO driving 1,200 organic signups/month. PLG referral loop converting at 18%.",
    "cac": "4.20",
    "targetCac": "8.00",
    "mrr": "12400",
    "arr": "148800",
    "burnRate": "18000",
    "runway": "11",
    "unitEconomics": "LTV 67, CAC 4.20, LTV:CAC 16:1",
    "projectedArr12m": "580000",
    "revenueModel": "Freemium to 9.99/mo Pro (29.99/mo Coach tier launching Q2)"
  }'::jsonb,
  'scored',
  NOW() - INTERVAL '14 days'
);

-- ── 4. Q-Score history — two entries to show delta ───────────────────────────
-- Entry 1: 4 weeks ago (before agent coaching)
INSERT INTO qscore_history (
  id, user_id, assessment_id,
  overall_score, percentile, grade,
  market_score, product_score, gtm_score,
  financial_score, team_score, traction_score,
  calculated_at
) VALUES (
  v_prev_score_id::uuid,
  v_user_id,
  v_assessment_id::uuid,
  63, 48, 'C+',
  72, 76, 55,
  47, 68, 52,
  NOW() - INTERVAL '28 days'
);

-- Entry 2: current score, linked to previous via previous_score_id
INSERT INTO qscore_history (
  id, user_id, assessment_id, previous_score_id,
  overall_score, percentile, grade,
  market_score, product_score, gtm_score,
  financial_score, team_score, traction_score,
  calculated_at
) VALUES (
  v_curr_score_id::uuid,
  v_user_id,
  v_assessment_id::uuid,
  v_prev_score_id::uuid,
  72, 67, 'B',
  80, 84, 65,
  58, 76, 66,
  NOW() - INTERVAL '2 days'
);

-- ── 5. Agent conversations ────────────────────────────────────────────────────

-- Patel (GTM)
INSERT INTO agent_conversations (id, user_id, agent_id, title, last_message_at, message_count)
VALUES (
  v_conv_patel_id::uuid, v_user_id, 'patel',
  'GTM channel strategy for PLG',
  NOW() - INTERVAL '1 day', 14
);

INSERT INTO agent_messages (conversation_id, role, content, created_at) VALUES
  (v_conv_patel_id::uuid, 'assistant',
   'Welcome! I''m Patel. I focus on Go-to-Market strategy. I''ve looked at your Q-Score — your GTM dimension is at 65, which is decent but there''s clear room to grow. What''s your current primary acquisition channel?',
   NOW() - INTERVAL '5 days'),
  (v_conv_patel_id::uuid, 'user',
   'Mostly SEO and some word of mouth. We''re getting about 1,200 organic signups a month but I''m not sure how to scale beyond that.',
   NOW() - INTERVAL '5 days'),
  (v_conv_patel_id::uuid, 'assistant',
   '1,200 organic signups with a $4.20 CAC is genuinely impressive for a pre-seed startup — you''ve found a signal. The question now is whether to pour fuel on SEO or open a second channel before you raise. What''s your conversion rate from free signup to paid?',
   NOW() - INTERVAL '5 days'),
  (v_conv_patel_id::uuid, 'user',
   'About 6.2% convert to Pro within 30 days.',
   NOW() - INTERVAL '4 days'),
  (v_conv_patel_id::uuid, 'assistant',
   '6.2% is good. Industry benchmark for PLG is 3-8%, so you''re in the top half. Here''s the decision I''d push you to make: SEO scales slowly — it compounds over 6-12 months. If you''re raising in the next 6 months, you need a faster-moving channel to show growth acceleration in the metrics. Have you tested any outbound to product managers or consultants directly?',
   NOW() - INTERVAL '4 days'),
  (v_conv_patel_id::uuid, 'user',
   'Not really. I was worried outbound would feel too pushy for a consumer-ish product.',
   NOW() - INTERVAL '3 days'),
  (v_conv_patel_id::uuid, 'assistant',
   'That''s a common misconception. You''re not selling to consumers — your ICP is knowledge workers at companies. A warm outbound sequence to PMs on LinkedIn, framed around the stat that 80% of habit apps fail within 30 days, would feel like a service, not a pitch. I''d run 200 personalised DMs as an experiment this week. What''s stopping you from testing that this week?',
   NOW() - INTERVAL '1 day');

-- Felix (Finance)
INSERT INTO agent_conversations (id, user_id, agent_id, title, last_message_at, message_count)
VALUES (
  v_conv_felix_id::uuid, v_user_id, 'felix',
  'Unit economics and fundraise prep',
  NOW() - INTERVAL '3 days', 10
);

INSERT INTO agent_messages (conversation_id, role, content, created_at) VALUES
  (v_conv_felix_id::uuid, 'assistant',
   'Hi, I''m Felix — I focus on financial modelling and fundraise prep. Your financial score is 58, which is the lowest of your six dimensions. Let''s fix that. First question: have you built a proper 12-month financial model, or are you working from a spreadsheet with rough projections?',
   NOW() - INTERVAL '10 days'),
  (v_conv_felix_id::uuid, 'user',
   'Spreadsheet with rough projections honestly. Revenue, burn, headcount. Nothing too sophisticated.',
   NOW() - INTERVAL '10 days'),
  (v_conv_felix_id::uuid, 'assistant',
   'That''s the norm at your stage, but it becomes a problem in investor conversations. VCs will probe your assumptions, and if you can''t walk them through the model in real-time, it signals financial immaturity. What''s your current burn, and how does it break down between people and tools?',
   NOW() - INTERVAL '9 days'),
  (v_conv_felix_id::uuid, 'user',
   '$18k/month. About $14k is salaries (3 people, I take minimal salary), $4k is cloud infra and tools.',
   NOW() - INTERVAL '9 days'),
  (v_conv_felix_id::uuid, 'assistant',
   'Strong discipline on personal salary — that''s a green flag for investors. Your LTV:CAC of 16:1 is exceptional — most investors look for 3:1 minimum. That number needs to be on slide 2 of your deck. Are you tracking churn properly, and do you have monthly cohort data?',
   NOW() - INTERVAL '8 days'),
  (v_conv_felix_id::uuid, 'user',
   'We track it monthly. Churn is about 4.8% monthly.',
   NOW() - INTERVAL '8 days'),
  (v_conv_felix_id::uuid, 'assistant',
   '4.8% monthly churn translates to roughly 45% annual churn — that''s on the high side for a subscription product. Your D-30 retention of 68% tells a different story, so let''s untangle it. Are users churning after month 1 predominantly, or is it distributed across months?',
   NOW() - INTERVAL '3 days');

-- Nova (Product)
INSERT INTO agent_conversations (id, user_id, agent_id, title, last_message_at, message_count)
VALUES (
  v_conv_nova_id::uuid, v_user_id, 'nova',
  'Product-market fit signals',
  NOW() - INTERVAL '6 days', 8
);

INSERT INTO agent_messages (conversation_id, role, content, created_at) VALUES
  (v_conv_nova_id::uuid, 'assistant',
   'I''m Nova — I work on product-market fit. Your product score is 84, which is the highest dimension on your profile. That tells me you''ve built something people genuinely want. My question is: can you point to one moment in the product where users feel the aha? What''s the event that correlates most strongly with long-term retention?',
   NOW() - INTERVAL '20 days'),
  (v_conv_nova_id::uuid, 'user',
   'When a user completes their first full 7-day stone plan without breaking the streak. Churn drops dramatically after that moment.',
   NOW() - INTERVAL '20 days'),
  (v_conv_nova_id::uuid, 'assistant',
   'That''s a very specific, measurable activation event — exactly what investors want to hear. What percentage of new signups reach that moment within their first 14 days?',
   NOW() - INTERVAL '19 days'),
  (v_conv_nova_id::uuid, 'user',
   'About 31% right now.',
   NOW() - INTERVAL '19 days'),
  (v_conv_nova_id::uuid, 'assistant',
   '31% is meaningful but has headroom. The question is: what happens between signup and that moment? Walk me through the onboarding flow — where do people drop out before reaching their first completed stone plan?',
   NOW() - INTERVAL '6 days');

-- ── 6. Subscription usage ─────────────────────────────────────────────────────
INSERT INTO subscription_usage (user_id, feature, usage_count, limit_count, reset_at) VALUES
  (v_user_id, 'agent_chat',          32, NULL, NOW() + INTERVAL '30 days'),
  (v_user_id, 'qscore_recalc',        2, NULL, NOW() + INTERVAL '30 days'),
  (v_user_id, 'investor_connection',  3, NULL, NOW() + INTERVAL '30 days');

-- ── 7. Analytics events ───────────────────────────────────────────────────────
INSERT INTO analytics_events (user_id, event_type, event_data, created_at) VALUES
  (v_user_id, 'onboarding_completed',   '{"step":"score_reveal"}'::jsonb,            NOW() - INTERVAL '28 days'),
  (v_user_id, 'assessment_submitted',   '{"score":63}'::jsonb,                        NOW() - INTERVAL '28 days'),
  (v_user_id, 'agent_chat_started',     '{"agent_id":"nova"}'::jsonb,                 NOW() - INTERVAL '20 days'),
  (v_user_id, 'agent_chat_started',     '{"agent_id":"felix"}'::jsonb,                NOW() - INTERVAL '17 days'),
  (v_user_id, 'agent_chat_started',     '{"agent_id":"patel"}'::jsonb,                NOW() - INTERVAL '14 days'),
  (v_user_id, 'assessment_submitted',   '{"score":72,"improved_by":9}'::jsonb,        NOW() - INTERVAL '2 days'),
  (v_user_id, 'marketplace_visited',    '{"investors_viewed":8}'::jsonb,              NOW() - INTERVAL '1 day'),
  (v_user_id, 'connection_request_sent','{"investor":"Apex Ventures"}'::jsonb,        NOW() - INTERVAL '1 day');

END $$;

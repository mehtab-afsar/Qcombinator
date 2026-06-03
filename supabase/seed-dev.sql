-- =============================================================================
-- DEV SEED — Test accounts for local / staging use
-- =============================================================================
-- Founder:  test@123   / Test@123
-- Investor: test@1234  / Test@1234
--
-- APPLY:  Paste into Supabase SQL Editor and Run
-- DELETE: Uncomment and run the CLEANUP block at the bottom, then delete this file
--
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING
-- =============================================================================

-- Fixed UUIDs so the seed is deterministic across environments
DO $$
DECLARE
  v_founder_id  UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_investor_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_next_month  TIMESTAMPTZ := NOW() + INTERVAL '1 month';
BEGIN

  -- ── 1. Auth users ────────────────────────────────────────────────────────
  --
  -- Inserts directly into auth.users (Supabase internal table).
  -- email_confirmed_at is set so login works immediately without email verification.

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_founder_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@123',
    crypt('Test@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"founder","full_name":"Test Founder"}',
    NOW(),
    NOW(),
    '', '', '', ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_investor_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@1234',
    crypt('Test@1234', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"investor","full_name":"Test Investor","fund_name":"Test Ventures"}',
    NOW(),
    NOW(),
    '', '', '', ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. auth.identities (required for email/password login) ───────────────

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_founder_id,
    'test@123',
    jsonb_build_object('sub', v_founder_id::text, 'email', 'test@123'),
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_investor_id,
    'test@1234',
    jsonb_build_object('sub', v_investor_id::text, 'email', 'test@1234'),
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- ── 3. founder_profiles ──────────────────────────────────────────────────

  INSERT INTO founder_profiles (
    user_id,
    full_name,
    founder_name,
    company_name,
    startup_name,
    industry,
    stage,
    role,
    subscription_tier,
    onboarding_completed,
    assessment_completed,
    registration_completed,
    profile_builder_completed,
    tagline,
    location,
    startup_profile_data
  ) VALUES (
    v_founder_id,
    'Test Founder',
    'Test Founder',
    'TestCo',
    'TestCo-seed',
    'b2b_saas',
    'mvp',
    'founder',
    'enterprise',
    true,
    false,
    true,
    false,
    'AI that sells for your sales team',
    'San Francisco, CA',
    '{"problemStatement":"Sales teams waste 40% of their time on manual CRM updates instead of selling.","targetCustomer":"VP of Sales at B2B SaaS companies with 50–200 employees"}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- ── 4. qscore_history (initial score for founder) ────────────────────────

  INSERT INTO qscore_history (
    user_id,
    overall_score,
    p1_score,
    p2_score,
    p3_score,
    p4_score,
    p5_score,
    p6_score,
    data_source
  ) VALUES (
    v_founder_id,
    42,
    38,
    45,
    30,
    55,
    40,
    35,
    'registration'
  );

  -- ── 5. subscription_usage (founder unlimited dev limits) ─────────────────

  INSERT INTO subscription_usage (user_id, feature, usage_count, limit_count, reset_at)
  VALUES
    (v_founder_id, 'agent_chat',          0, 999, v_next_month),
    (v_founder_id, 'qscore_recalc',       0, 99,  v_next_month),
    (v_founder_id, 'investor_connection',  0, 99,  v_next_month)
  ON CONFLICT DO NOTHING;

  -- ── 6. investor_profiles ─────────────────────────────────────────────────

  INSERT INTO investor_profiles (
    user_id,
    full_name,
    email,
    firm_name,
    firm_type,
    check_sizes,
    stages,
    sectors,
    thesis,
    onboarding_completed
  ) VALUES (
    v_investor_id,
    'Test Investor',
    'test@1234',
    'Test Ventures',
    'vc',
    ARRAY['$100K–$500K', '$500K–$2M'],
    ARRAY['pre-seed', 'seed', 'mvp'],
    ARRAY['ai_ml', 'b2b_saas', 'fintech'],
    'Test Ventures invests in early-stage B2B software companies solving measurable enterprise pain points.',
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE '✅ Seed complete — Founder: test@123 / Test@123 | Investor: test@1234 / Test@1234';

END $$;


-- =============================================================================
-- CLEANUP — run this block to fully remove both test accounts and all their data
-- =============================================================================
/*

DO $$
DECLARE
  v_founder_id  UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_investor_id UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
BEGIN
  -- Profile data (cascades via ON DELETE CASCADE on user_id FK)
  DELETE FROM founder_profiles  WHERE user_id IN (v_founder_id, v_investor_id);
  DELETE FROM investor_profiles WHERE user_id IN (v_founder_id, v_investor_id);
  DELETE FROM qscore_history    WHERE user_id IN (v_founder_id, v_investor_id);
  DELETE FROM subscription_usage WHERE user_id IN (v_founder_id, v_investor_id);

  -- Auth (must come last — cascades will handle remaining child rows)
  DELETE FROM auth.identities WHERE user_id IN (v_founder_id, v_investor_id);
  DELETE FROM auth.users      WHERE id       IN (v_founder_id, v_investor_id);

  RAISE NOTICE '🗑  Test accounts removed';
END $$;

*/

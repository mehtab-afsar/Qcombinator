-- ============================================================
-- Edge Alpha - Full Platform Seed
-- User:    mehtab@gmail.com / Moon@123
-- Company: Nuvora (B2B SaaS, supply chain visibility, DACH)
-- State:   Registration complete, Profile Builder complete, Q-Score 74
--          All 9 agents used, deals pipeline, competitors tracked
-- Run via: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Constraints are managed via migrations (20260326000002_expand_constraints.sql)

-- ── Main seed block ──────────────────────────────────────────
DO $$
DECLARE
  v_user_id   UUID;

  -- Q-Score chain
  v_score_1   UUID := 'a1b2c3d4-0000-0000-0000-000000000010';
  v_score_2   UUID := 'a1b2c3d4-0000-0000-0000-000000000011';
  v_score_3   UUID := 'a1b2c3d4-0000-0000-0000-000000000012';

  -- Conversations (one per agent)
  v_conv_p    UUID := 'a1b2c3d4-0000-0000-0000-000000000020'; -- patel
  v_conv_f    UUID := 'a1b2c3d4-0000-0000-0000-000000000021'; -- felix
  v_conv_a    UUID := 'a1b2c3d4-0000-0000-0000-000000000022'; -- atlas
  v_conv_h    UUID := 'a1b2c3d4-0000-0000-0000-000000000023'; -- harper
  v_conv_s    UUID := 'a1b2c3d4-0000-0000-0000-000000000024'; -- sage
  v_conv_su   UUID := 'a1b2c3d4-0000-0000-0000-000000000025'; -- susi
  v_conv_m    UUID := 'a1b2c3d4-0000-0000-0000-000000000026'; -- maya
  v_conv_n    UUID := 'a1b2c3d4-0000-0000-0000-000000000027'; -- nova
  v_conv_l    UUID := 'a1b2c3d4-0000-0000-0000-000000000028'; -- leo

  -- Artifacts
  v_art_p     UUID := 'a1b2c3d4-0000-0000-0000-000000000030'; -- gtm_playbook
  v_art_f     UUID := 'a1b2c3d4-0000-0000-0000-000000000031'; -- financial_summary
  v_art_a     UUID := 'a1b2c3d4-0000-0000-0000-000000000032'; -- competitive_matrix
  v_art_h     UUID := 'a1b2c3d4-0000-0000-0000-000000000033'; -- hiring_plan
  v_art_sg    UUID := 'a1b2c3d4-0000-0000-0000-000000000034'; -- strategic_plan
  v_art_su    UUID := 'a1b2c3d4-0000-0000-0000-000000000035'; -- sales_script
  v_art_m     UUID := 'a1b2c3d4-0000-0000-0000-000000000036'; -- brand_messaging
  v_art_n     UUID := 'a1b2c3d4-0000-0000-0000-000000000037'; -- pmf_survey
  v_art_l     UUID := 'a1b2c3d4-0000-0000-0000-000000000038'; -- legal_checklist
  v_art_icp   UUID := 'a1b2c3d4-0000-0000-0000-000000000039'; -- icp_document

BEGIN

  -- ── 1. Auth user (get-or-create) ────────────────────────────
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'mehtab@gmail.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'mehtab@gmail.com',
      crypt('Moon@123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Mehtab Afsar"}',
      NOW() - INTERVAL '22 days', NOW(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at, provider_id
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'mehtab@gmail.com'),
      'email', NOW(), NOW() - INTERVAL '22 days', NOW(),
      'mehtab@gmail.com'
    );

    RAISE NOTICE 'Created new user: %', v_user_id;
  ELSE
    UPDATE auth.users
      SET encrypted_password  = crypt('Moon@123', gen_salt('bf')),
          email_confirmed_at  = COALESCE(email_confirmed_at, NOW()),
          updated_at          = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'Updated existing user: %', v_user_id;
  END IF;


  -- ── 2. Founder profile (full registration + profile builder) ─
  INSERT INTO public.founder_profiles (
    user_id,
    full_name, startup_name, industry, stage,
    subscription_tier, onboarding_completed, assessment_completed,
    role,
    -- Registration fields (new)
    company_name, website, founded_date, incorporation_type, description,
    revenue_status, funding_status, funding, team_size,
    founder_name, linkedin_url,
    cofounder_count, years_on_problem, prior_experience,
    registration_completed,
    -- Profile Builder state
    profile_builder_completed, profile_builder_completed_at,
    -- Stripe / signal
    stripe_verified, signal_strength, integrity_index,
    created_at, updated_at
  ) VALUES (
    v_user_id,
    'Mehtab Afsar', 'Nuvora', 'B2B SaaS', 'mvp',
    'premium', true, true,
    'founder',
    -- Registration
    'Nuvora', 'https://nuvora.io',
    '2023-06', 'Delaware C-Corp',
    'Real-time multi-tier supplier inventory visibility for mid-market manufacturers - catch shortages weeks before they become production halts.',
    'First revenue <$10K MRR', 'Seed', 'seed', '3-5',
    'Mehtab Afsar', 'https://linkedin.com/in/mehtabafsar',
    1, '3-5', 'Founded and exited',
    true,
    -- Profile Builder
    true, NOW() - INTERVAL '8 days',
    -- Signals
    false, 78, 82,
    NOW() - INTERVAL '22 days', NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET company_name                = EXCLUDED.company_name,
        startup_name                = EXCLUDED.startup_name,
        industry                    = EXCLUDED.industry,
        stage                       = EXCLUDED.stage,
        subscription_tier           = EXCLUDED.subscription_tier,
        onboarding_completed        = EXCLUDED.onboarding_completed,
        assessment_completed        = EXCLUDED.assessment_completed,
        website                     = EXCLUDED.website,
        founded_date                = EXCLUDED.founded_date,
        incorporation_type          = EXCLUDED.incorporation_type,
        description                 = EXCLUDED.description,
        revenue_status              = EXCLUDED.revenue_status,
        funding_status              = EXCLUDED.funding_status,
        funding                     = EXCLUDED.funding,
        team_size                   = EXCLUDED.team_size,
        founder_name                = EXCLUDED.founder_name,
        linkedin_url                = EXCLUDED.linkedin_url,
        cofounder_count             = EXCLUDED.cofounder_count,
        years_on_problem            = EXCLUDED.years_on_problem,
        prior_experience            = EXCLUDED.prior_experience,
        registration_completed      = EXCLUDED.registration_completed,
        profile_builder_completed   = EXCLUDED.profile_builder_completed,
        profile_builder_completed_at= EXCLUDED.profile_builder_completed_at,
        signal_strength             = EXCLUDED.signal_strength,
        integrity_index             = EXCLUDED.integrity_index,
        updated_at                  = NOW();


  -- ── 3. Subscription usage (free tier reset next month) ───────
  INSERT INTO public.subscription_usage (user_id, feature, usage_count, limit_count, reset_at)
  VALUES
    (v_user_id, 'agent_chat',          34, 50, date_trunc('month', NOW()) + INTERVAL '1 month'),
    (v_user_id, 'qscore_recalc',        1,  2, date_trunc('month', NOW()) + INTERVAL '1 month'),
    (v_user_id, 'investor_connection',  2,  3, date_trunc('month', NOW()) + INTERVAL '1 month')
  ON CONFLICT DO NOTHING;


  -- ── 4. Q-Score history chain ─────────────────────────────────

  -- Row 1 - Registration baseline (zero score, honest start)
  INSERT INTO public.qscore_history (
    id, user_id, overall_score,
    market_score, product_score, gtm_score, financial_score, team_score, traction_score,
    percentile, grade, data_source, previous_score_id,
    assessment_data, calculated_at
  ) VALUES (
    v_score_1, v_user_id,
    0, 0, 0, 0, 0, 0, 0,
    NULL, 'F', 'registration', NULL,
    '{"stage":"mvp","revenueStatus":"First revenue <$10K MRR","fundingStatus":"Seed","teamSize":"3-5","cofounderCount":1,"yearsOnProblem":"3-5","priorExperience":"Founded and exited"}',
    NOW() - INTERVAL '20 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Row 2 - Profile Builder complete (full PRD Q-Score)
  INSERT INTO public.qscore_history (
    id, user_id, overall_score,
    market_score, product_score, gtm_score, financial_score, team_score, traction_score,
    percentile, grade, data_source, previous_score_id,
    assessment_data, ai_actions, calculated_at
  ) VALUES (
    v_score_2, v_user_id,
    68, 72, 74, 62, 58, 81, 60,
    61, 'C+', 'profile_builder', v_score_1,
    '{
      "problemStory": "I spent 6 years as a supply chain consultant at McKinsey. I watched a Tier-1 BMW supplier miss a shipment because their Tier-2 supplier ran out of a $0.03 capacitor nobody tracked. That single miss cost BMW €14M in halted production.",
      "advantages": ["6 years at McKinsey in supply chain practice","Deep relationships with procurement heads at 40+ manufacturers","Prior exit - supply chain analytics tool acquired 2021"],
      "advantageExplanation": "Domain depth, network, and prior exit. No VC-backed competitor has a founder who has actually sat inside procurement departments.",
      "customerQuote": "We had a $4M production halt in Q3 because nobody flagged that our Indonesian capacitor supplier had 3 days of stock left. If Nuvora had been live, we would have caught that 6 weeks earlier.",
      "conversationCount": 87,
      "customerCommitment": "paid",
      "customerSurprise": "Customers do not want more dashboards - they want automated Slack alerts so they never have to log in.",
      "failedBelief": "I thought procurement teams would pay for visibility. They pay for risk prevention. That reframe changed our entire pricing model.",
      "hardshipStory": "Our first enterprise pilot pulled out 3 days before go-live. 11 days of runway. I personally guaranteed a bridging loan to make payroll. We came back with 2 new pilots in 6 weeks.",
      "targetCustomers": 8500,
      "conversionRate": 2.1,
      "lifetimeValue": 85000,
      "costPerAcquisition": 12000,
      "icpDescription": "VP of Procurement or Head of Supply Chain at mid-market manufacturers (200-2000 employees, €50M-€500M revenue) in automotive, electronics, and industrial equipment in DACH and Benelux who experienced at least one production halt in the last 18 months.",
      "channelsTried": ["LinkedIn outbound","Hannover Messe","McKinsey alumni network","supply chain risk whitepaper"],
      "currentCAC": 12000,
      "mrr": 38000,
      "monthlyBurn": 52000,
      "runway": 14,
      "buildTime": 8,
      "tested": "ERP integration connectors, real-time alert threshold engine, risk scoring model",
      "results": "Customers reduced unplanned production stoppages by 67% in first 90 days",
      "learned": "API integrations with SAP and Oracle take 3x longer than expected due to enterprise IT approval cycles",
      "changed": "Built lightweight CSV import fallback so customers get value on day 1 without waiting for IT"
    }',
    '{
      "actions": [
        {"title":"Nail your SAM with a bottom-up model","description":"Your TAM is strong but investors will drill on SAM. Build a bottom-up model from LinkedIn company counts in DACH + Benelux.","dimension":"market","impact":"+6 points","agentId":"atlas","agentName":"Atlas","timeframe":"1 week"},
        {"title":"Document your ICP with a named-customer matrix","description":"Your ICP description is good but needs quantified firmographic attributes. Map your 6 paying customers.","dimension":"goToMarket","impact":"+5 points","agentId":"patel","agentName":"Patel","timeframe":"3 days"},
        {"title":"Build a 24-month financial model","description":"ARR and runway are solid but no documented projections. Investors need a model, not just a number.","dimension":"financial","impact":"+8 points","agentId":"felix","agentName":"Felix","timeframe":"1 week"}
      ]
    }',
    NOW() - INTERVAL '8 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Row 3 - Post-artifact agent boosts (+6 GTM, +6 Financial)
  INSERT INTO public.qscore_history (
    id, user_id, overall_score,
    market_score, product_score, gtm_score, financial_score, team_score, traction_score,
    percentile, grade, data_source, source_artifact_type, previous_score_id,
    assessment_data, calculated_at
  ) VALUES (
    v_score_3, v_user_id,
    74, 72, 74, 68, 64, 81, 60,
    67, 'C+', 'agent_artifact', 'financial_summary', v_score_2,
    '{"mrr":38000,"monthlyBurn":52000,"runway":14,"conversationCount":87,"customerCommitment":"paid"}',
    NOW() - INTERVAL '3 days'
  ) ON CONFLICT (id) DO NOTHING;


  -- ── 5. Profile Builder data (5 sections, all complete) ───────
  INSERT INTO public.profile_builder_data (
    user_id, section, raw_conversation, extracted_fields, confidence_map,
    completion_score, completed_at, created_at, updated_at
  ) VALUES
  (
    v_user_id, 1,
    'Q: Do you have LOIs, pilots, or signed trials? A: Yes - 6 signed annual contracts, €60K-€96K ACV each. All paying. 5 renewing this year. Q: Has any customer paid you? A: Yes, 6 paying customers, €38K MRR total. Q: Are customers coming back? A: NRR is 118%. One customer expanded from €72K to €96K after first year.',
    '{"earlySignal":{"lois":0,"pilots":0,"signedTrials":6,"paidContracts":6},"willingnessToPay":true,"mrr":38000,"nrr":118,"largestContractValue":96000}',
    '{"earlySignal":0.85,"willingnessToPay":0.85,"mrr":0.85,"nrr":0.85,"largestContractValue":0.85}',
    100, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  ),
  (
    v_user_id, 2,
    'Q: How many companies have this problem? A: 85,000 manufacturers in DACH + Benelux with 200-2000 employees. Of those, about 28,000 have complex multi-tier supply chains with SAP or Oracle ERPs. Our initial beachhead is 8,500 in automotive, electronics, industrial equipment. Q: What are customers spending today? A: Typical VP Procurement budget for supply chain risk tools is €80K-€150K per year. Most are spending it on consultants who do annual reviews - not real-time tools. Q: Where do you go after first 100 customers? A: Expand to Benelux (Netherlands, Belgium) first, then Nordics. Adjacent segment: contract manufacturers for defence and aerospace.',
    '{"buyerCount":8500,"marketUrgency":"high","currentSpend":115000,"tamGlobal":12400000000,"samDach":1800000000,"som3yr":180000000,"expansionPath":["Benelux","Nordics","Defence/Aerospace"]}',
    '{"buyerCount":0.7,"marketUrgency":0.55,"currentSpend":0.55,"expansion":0.55}',
    95, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  ),
  (
    v_user_id, 3,
    'Q: Filed or granted patents? A: One patent filed - US Application 18/234,891 - covering our multi-tier inventory aggregation algorithm. Filing date August 2023. Q: What is technically hard about what you built? A: Three things: (1) real-time data sync across SAP/Oracle/NetSuite with different API schemas (2) our risk scoring model trained on 14M supply chain events (3) alert threshold engine that learns from each customer historical production pattern. Q: How long would a well-funded competitor take to reach parity? A: SAP or Oracle could match us in 18-24 months if they prioritised mid-market. A VC-backed startup would need 12-18 months minimum for the ERP integrations alone.',
    '{"patentsFiledCount":1,"patentNumbers":["US 18/234,891"],"technicalDepth":"high","buildMonths":18,"replicationBarrierMonths":18,"proprietaryDatasets":["14M supply chain events training dataset"]}',
    '{"patents":0.85,"technicalDepth":0.55,"buildTime":0.55,"replicationBarrier":0.55}',
    90, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  ),
  (
    v_user_id, 4,
    'Q: Tell me your story. A: 6 years at McKinsey in the supply chain practice. Served BMW, Bosch, Siemens. Left in 2019 to build a supply chain analytics tool - sold it to a PE-backed logistics company in 2021. Saw the same problem every engagement: nobody had live visibility into their suppliers'' suppliers. Q: Walk me through your team. A: 4 full-time. Aarav Singh, CTO, 10 years enterprise integration, ex-SAP R&D. Lars Mueller, Head of Sales, 5 years B2B SaaS, sold supply chain software before. Priya Nair, Lead Engineer, full-stack with SAP/Oracle integration specialist. Q: Has anyone left in the last 12 months? A: No, all 4 founders and early employees still here.',
    '{"founderStory":"McKinsey supply chain 6yrs, prior exit 2021","priorExits":1,"founderMarketFit":"high","teamSize":4,"cofounderCount":1,"teamCohesion":"stable","leadershipGaps":["Marketing/Growth","CFO"]}',
    '{"founderStory":0.55,"priorExits":0.55,"teamCohesion":0.55}',
    100, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  ),
  (
    v_user_id, 5,
    'Q: What is your current MRR and monthly burn? A: €38K MRR, €52K monthly burn, 14 months runway. Q: Does your product reduce carbon emissions? A: Yes - our customers reduce expedited air freight (the largest carbon cost in supply chains) by catching shortages early and using sea/rail freight instead. One customer reduced their logistics carbon footprint by 23% in year one. Q: Is your impact tied to your revenue model? A: Directly - we charge per supplier tier connected. More suppliers connected means more carbon-efficient logistics and more revenue for us.',
    '{"mrr":38000,"monthlyBurn":52000,"runway":14,"grossMargin":82,"climateImpact":"reduces expedited air freight, 23% logistics carbon reduction documented","impactTiedToRevenue":true,"businessModelIntegrity":"high"}',
    '{"financials":0.85,"climateImpact":0.55,"businessModelIntegrity":0.55}',
    88, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  )
  ON CONFLICT (user_id, section) DO UPDATE
    SET extracted_fields  = EXCLUDED.extracted_fields,
        completion_score  = EXCLUDED.completion_score,
        completed_at      = EXCLUDED.completed_at,
        updated_at        = NOW();


  -- ── 6. Agent conversations ────────────────────────────────────
  INSERT INTO public.agent_conversations (id, user_id, agent_id, title, message_count, last_message_at, created_at)
  VALUES
    (v_conv_p,  v_user_id, 'patel',  'GTM Strategy for Nuvora',                          8, NOW()-INTERVAL '9 days',  NOW()-INTERVAL '9 days'),
    (v_conv_f,  v_user_id, 'felix',  'Financial Model & Runway Analysis',                8, NOW()-INTERVAL '7 days',  NOW()-INTERVAL '7 days'),
    (v_conv_a,  v_user_id, 'atlas',  'Competitive Landscape - Supply Chain Visibility',  8, NOW()-INTERVAL '5 days',  NOW()-INTERVAL '5 days'),
    (v_conv_h,  v_user_id, 'harper', 'Hiring Plan - Engineering & Sales',                6, NOW()-INTERVAL '4 days',  NOW()-INTERVAL '4 days'),
    (v_conv_s,  v_user_id, 'sage',   '12-Month Strategic OKR Plan',                      6, NOW()-INTERVAL '2 days',  NOW()-INTERVAL '2 days'),
    (v_conv_su, v_user_id, 'susi',   'Enterprise Sales Pitch for Nuvora',                6, NOW()-INTERVAL '6 days',  NOW()-INTERVAL '6 days'),
    (v_conv_m,  v_user_id, 'maya',   'Nuvora Brand Messaging & Identity',                5, NOW()-INTERVAL '11 days', NOW()-INTERVAL '11 days'),
    (v_conv_n,  v_user_id, 'nova',   'PMF Survey - Supply Chain Buyers',                 5, NOW()-INTERVAL '13 days', NOW()-INTERVAL '13 days'),
    (v_conv_l,  v_user_id, 'leo',    'Legal Checklist - Delaware C-Corp Setup',          4, NOW()-INTERVAL '15 days', NOW()-INTERVAL '15 days')
  ON CONFLICT (id) DO NOTHING;


  -- ── 7. Agent messages ─────────────────────────────────────────

  -- Patel
  INSERT INTO public.agent_messages (id, conversation_id, user_id, role, content, created_at) VALUES
    (gen_random_uuid(), v_conv_p, v_user_id, 'user',
     'I need help building our GTM strategy. We are targeting VP Procurement at mid-market manufacturers in DACH. We have 6 paying customers at €5K-€8K MRR each.',
     NOW()-INTERVAL '9 days'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'assistant',
     'Great foundation. With 6 paying customers you have real signal. Are you seeing better conversion in Germany, Austria, or Switzerland? And are your 6 customers coming from inbound or outbound?',
     NOW()-INTERVAL '9 days'+INTERVAL '3 min'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'user',
     '5 out of 6 came from warm intros through my McKinsey network. 1 from LinkedIn. Germany is 4 out of 6.',
     NOW()-INTERVAL '9 days'+INTERVAL '6 min'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'assistant',
     'Your traction is network-driven - great for validation, not yet scalable. Near-term: systematise the warm intro engine. Map your McKinsey alumni to procurement roles. Medium-term: publish anonymised supply chain risk data as quarterly reports and use them as LinkedIn outbound door-openers. Building the full GTM Playbook now...',
     NOW()-INTERVAL '9 days'+INTERVAL '9 min');

  -- Felix
  INSERT INTO public.agent_messages (id, conversation_id, user_id, role, content, created_at) VALUES
    (gen_random_uuid(), v_conv_f, v_user_id, 'user',
     'Felix, I need to model our financials. €38K MRR, €52K monthly burn, 14 months runway, 60-90 day enterprise sales cycle.',
     NOW()-INTERVAL '7 days'),
    (gen_random_uuid(), v_conv_f, v_user_id, 'assistant',
     'Good starting point. Are these annual contracts paid upfront, and what is your ACV range? Also, do you have any deals close to closing?',
     NOW()-INTERVAL '7 days'+INTERVAL '3 min'),
    (gen_random_uuid(), v_conv_f, v_user_id, 'user',
     'Annual contracts paid upfront, €60K-€96K ACV. 4 full time. 3 pipeline deals ~€220K total ACV expected close in 45 days.',
     NOW()-INTERVAL '7 days'+INTERVAL '6 min'),
    (gen_random_uuid(), v_conv_f, v_user_id, 'assistant',
     'This is stronger than headlines suggest. Current ARR €456K. With pipeline closed, ARR jumps to €676K and you get a €220K upfront cash injection extending runway to 18-20 months. Building your 24-month model now...',
     NOW()-INTERVAL '7 days'+INTERVAL '9 min');

  -- Susi
  INSERT INTO public.agent_messages (id, conversation_id, user_id, role, content, created_at) VALUES
    (gen_random_uuid(), v_conv_su, v_user_id, 'user',
     'Susi, I need a sales script for pitching Nuvora to VP Procurement at automotive manufacturers. Our ACV is €72K-€96K annual.',
     NOW()-INTERVAL '6 days'),
    (gen_random_uuid(), v_conv_su, v_user_id, 'assistant',
     'I will build a discovery-led sales script. What is the most common objection you hit at the qualification stage? And what does your current demo structure look like?',
     NOW()-INTERVAL '6 days'+INTERVAL '3 min'),
    (gen_random_uuid(), v_conv_su, v_user_id, 'user',
     'Main objection: "We already have SAP" or "our IT department handles this." Demo: 20 min live walkthrough of our dashboard showing a production halt that our system caught 5 weeks early.',
     NOW()-INTERVAL '6 days'+INTERVAL '6 min'),
    (gen_random_uuid(), v_conv_su, v_user_id, 'assistant',
     'Great. The SAP objection is actually an opening - SAP does not do multi-tier supplier inventory, and your IT buyer is not your economic buyer. I will build the full script with discovery questions, SAP objection handling, and a ROI calculator close. Building now...',
     NOW()-INTERVAL '6 days'+INTERVAL '9 min');

  -- Maya
  INSERT INTO public.agent_messages (id, conversation_id, user_id, role, content, created_at) VALUES
    (gen_random_uuid(), v_conv_m, v_user_id, 'user',
     'Maya, we need brand messaging. Core audience is VP Procurement at manufacturers. We prevent production halts.',
     NOW()-INTERVAL '11 days'),
    (gen_random_uuid(), v_conv_m, v_user_id, 'assistant',
     'Love the clarity. "Prevent production halts" is strong - let me test some headline variants. What emotion do your customers feel right before they find out a supplier has failed them? And what is your one-liner for the problem you solve?',
     NOW()-INTERVAL '11 days'+INTERVAL '3 min'),
    (gen_random_uuid(), v_conv_m, v_user_id, 'user',
     'Fear and helplessness. They find out too late to do anything. One-liner: "We give procurement teams the early warning system they never had."',
     NOW()-INTERVAL '11 days'+INTERVAL '6 min');


  -- ── 8. Agent artifacts ────────────────────────────────────────

  -- Patel: GTM Playbook
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_p, v_user_id, 'patel', v_conv_p, 'gtm_playbook',
    'Nuvora GTM Playbook - DACH Enterprise',
    '{
      "summary": "Go-to-market strategy for Nuvora targeting VP Procurement at mid-market manufacturers (200-2000 employees) in DACH.",
      "icp": {
        "title": "VP Procurement / Head of Supply Chain",
        "company_size": "200-2000 employees",
        "revenue": "€50M-€500M",
        "sector": "Automotive, Electronics, Industrial Equipment",
        "geography": "Germany, Austria, Switzerland",
        "trigger": "Experienced at least one unplanned production halt in last 18 months"
      },
      "channels": [
        {"name":"McKinsey Alumni Network","type":"warm_intro","status":"proven","cac":"€4,000","notes":"5 of 6 customers sourced here. Build systematic referral programme."},
        {"name":"LinkedIn Outbound","type":"outbound","status":"testing","cac":"€18,000","notes":"Lower conversion but scalable. Use supply chain risk reports as door-openers."},
        {"name":"Hannover Messe","type":"events","status":"planned","cac":"€8,000 est.","notes":"Premier industrial event. 3 qualified meetings booked for next edition."}
      ],
      "messaging": {
        "headline": "Know before your production halts.",
        "subheadline": "Nuvora gives procurement teams live visibility into every tier of their supplier network - so you catch shortages weeks before they become stoppages.",
        "proof_point": "Nuvora customers reduced unplanned production halts by 67% in their first 90 days."
      },
      "execution_plan": [
        {"week":"1-2","action":"Map McKinsey alumni network to target company procurement roles"},
        {"week":"3-4","action":"Launch customer referral programme - 10% discount per successful intro"},
        {"week":"5-8","action":"Publish Q1 Supply Chain Risk Report as LinkedIn outbound opener"},
        {"week":"9-12","action":"Close 3 pipeline deals, document case studies for Hannover Messe"}
      ]
    }',
    1, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Patel: ICP Document
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_icp, v_user_id, 'patel', v_conv_p, 'icp_document',
    'Nuvora ICP - VP Procurement DACH',
    '{
      "title": "Ideal Customer Profile: VP Procurement / Head of Supply Chain",
      "firmographics": {
        "employees": "200-2000",
        "revenue": "€50M-€500M",
        "sectors": ["Automotive Tier 1-2","Electronics","Industrial Equipment"],
        "geography": ["Germany","Austria","Switzerland"],
        "erp": ["SAP","Oracle","NetSuite"]
      },
      "psychographics": {
        "fears": ["Unannounced production halt","Missed delivery to OEM customer","Board scrutiny after supply chain failure"],
        "goals": ["Zero unplanned production stoppages","Board-ready risk reporting","Faster supplier qualification"],
        "triggers": ["Recent production halt","New CPO hired","Post-COVID supply chain review","Failed audit"]
      },
      "qualification_questions": [
        "Have you experienced a production halt caused by supplier inventory failure in the last 18 months?",
        "How do you currently track Tier 2+ supplier inventory levels?",
        "What is your budget for supply chain risk tools this fiscal year?"
      ],
      "disqualifiers": ["< 200 employees","Retail/consumer goods only","No complex multi-tier supply chain"]
    }',
    1, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Felix: Financial Summary
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_f, v_user_id, 'felix', v_conv_f, 'financial_summary',
    'Nuvora 24-Month Financial Model',
    '{
      "current_metrics": {"mrr":38000,"arr":456000,"monthly_burn":52000,"runway_months":14,"gross_margin_pct":82,"acv":78000,"customers":6},
      "pipeline": {"deals":3,"total_acv":220000,"expected_close":"45 days","conservative":"2 of 3 close, 30-day slip"},
      "projections": {
        "month_6":  {"mrr":68000, "arr":816000,  "customers":12,"burn":58000},
        "month_12": {"mrr":112000,"arr":1344000, "customers":18,"burn":74000},
        "month_18": {"mrr":165000,"arr":1980000, "customers":26,"burn":95000},
        "month_24": {"mrr":230000,"arr":2760000, "customers":34,"burn":120000}
      },
      "unit_economics": {"ltv":312000,"cac":12000,"ltv_cac_ratio":26,"payback_months":4.8,"nrr":118},
      "raise": {
        "target":2500000,
        "use_of_funds":[
          {"category":"Sales & Marketing","pct":45,"amount":1125000},
          {"category":"Engineering","pct":35,"amount":875000},
          {"category":"Operations","pct":20,"amount":500000}
        ],
        "runway_post_raise":28
      }
    }',
    1, NOW()-INTERVAL '7 days', NOW()-INTERVAL '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Atlas: Competitive Matrix
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_a, v_user_id, 'atlas', v_conv_a, 'competitive_matrix',
    'Supply Chain Visibility - Competitive Landscape',
    '{
      "summary": "Nuvora operates in the supply chain visibility market. The mid-market DACH segment is underserved by current enterprise-focused players.",
      "competitors": [
        {"name":"project44","funding":"$900M","focus":"Transportation & logistics visibility","acv":"$500K+","weakness":"No multi-tier supplier inventory; US-centric","threat_level":"low"},
        {"name":"Resilinc","funding":"$60M","focus":"Supplier risk monitoring","acv":"$200K+","weakness":"Risk intelligence only - no live inventory; US-focused","threat_level":"medium"},
        {"name":"Interos","funding":"$115M","focus":"Supply chain risk intelligence","acv":"$150K+","weakness":"No operational inventory data; different buyer persona","threat_level":"low"},
        {"name":"SupplyShield","funding":"$8M","focus":"SMB supply chain alerts","acv":"$15K","weakness":"No ERP integration; no DACH presence","threat_level":"low"}
      ],
      "nuvora_advantages": [
        "Only mid-market-native product in DACH (sub-€100K ACV)",
        "ERP integration live in under 30 days vs 6-12 months for enterprise tools",
        "Real-time inventory data, not just risk scores",
        "Founder network advantage in DACH manufacturing"
      ],
      "market_size": {
        "tam":"$12.4B global supply chain visibility software (2025)",
        "sam":"$1.8B DACH + Benelux mid-market manufacturing segment",
        "som":"$180M addressable in next 3 years"
      }
    }',
    1, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Harper: Hiring Plan
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_h, v_user_id, 'harper', v_conv_h, 'hiring_plan',
    'Nuvora Hiring Plan - 18-Month Roadmap',
    '{
      "current_team": [
        {"role":"CEO / Co-founder","name":"Mehtab Afsar","background":"McKinsey supply chain 6yrs, prior exit 2021"},
        {"role":"CTO / Co-founder","name":"Aarav Singh","background":"10yrs enterprise integration, ex-SAP R&D"},
        {"role":"Head of Sales","name":"Lars Mueller","background":"5yrs B2B SaaS sales, DACH market"},
        {"role":"Lead Engineer","name":"Priya Nair","background":"Full-stack, ERP integration specialist"}
      ],
      "hiring_plan": [
        {"role":"Enterprise Account Executive (DACH)","priority":"high","timeline":"Month 1-2","rationale":"CEO closing all deals - needs sales capacity","comp":"€90K base + €60K OTE","requirements":["5+ yrs B2B SaaS AE","German native speaker","Manufacturing sector preferred"]},
        {"role":"Senior Backend Engineer","priority":"high","timeline":"Month 2-3","rationale":"ERP integration backlog at capacity","comp":"€100K-€120K","requirements":["4+ yrs backend","SAP/Oracle integration","Distributed systems"]},
        {"role":"Customer Success Manager","priority":"medium","timeline":"Month 4-5","rationale":"6 customers managed manually - churn risk at scale","comp":"€70K-€85K","requirements":["3+ yrs CS in B2B SaaS","Manufacturing background preferred"]},
        {"role":"Growth / Demand Gen","priority":"low","timeline":"Month 7-9","rationale":"Scale beyond warm intros once AE is ramped","comp":"€65K-€80K","requirements":["B2B SaaS demand gen","LinkedIn & content experience"]}
      ],
      "total_headcount_target": 9,
      "total_comp_budget_monthly": 88000
    }',
    1, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Sage: Strategic Plan
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_sg, v_user_id, 'sage', v_conv_s, 'strategic_plan',
    'Nuvora 12-Month Strategic Plan',
    '{
      "mission": "Make supply chain disruptions a thing of the past for mid-market manufacturers.",
      "north_star_metric": "ARR €2M by December 2026",
      "okrs": [
        {
          "objective": "Establish undeniable PMF in DACH automotive",
          "quarter": "Q1 2026",
          "key_results": [
            {"kr":"Close 3 pipeline deals → ARR €676K","owner":"CEO","status":"in_progress"},
            {"kr":"Achieve NRR above 115% across 6 customers","owner":"CSM","status":"on_track"},
            {"kr":"Publish 3 customer case studies with quantified ROI","owner":"Marketing","status":"planned"}
          ]
        },
        {
          "objective": "Build a scalable, repeatable sales motion",
          "quarter": "Q2 2026",
          "key_results": [
            {"kr":"Hire and onboard first Enterprise AE","owner":"CEO","status":"planned"},
            {"kr":"AE ramps to first close within 90 days","owner":"Sales","status":"planned"},
            {"kr":"Build SDR outbound playbook with 20% open rate","owner":"Marketing","status":"planned"}
          ]
        },
        {
          "objective": "Close Seed round - extend runway to 28 months",
          "quarter": "Q2 2026",
          "key_results": [
            {"kr":"Raise €2.5M Seed from 1-2 lead investors","owner":"CEO","status":"in_progress"},
            {"kr":"Build pipeline of 15 qualified investor intros","owner":"CEO","status":"in_progress"},
            {"kr":"Achieve ARR €900K before term sheet","owner":"All","status":"in_progress"}
          ]
        }
      ],
      "risks": [
        {"risk":"Pipeline deals slip beyond Q1","mitigation":"Weekly exec check-ins; parallel outbound to replace if needed"},
        {"risk":"Seed round takes longer than 3 months","mitigation":"Bridge facility from angels; cut burn to €42K if needed"},
        {"risk":"SAP launches mid-market product","mitigation":"Speed and customer intimacy moat; integrate deeper"}
      ]
    }',
    1, NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Susi: Sales Script
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_su, v_user_id, 'susi', v_conv_su, 'sales_script',
    'Nuvora Enterprise Sales Script - VP Procurement',
    '{
      "summary": "Discovery-led sales script for Nuvora targeting VP Procurement at automotive/electronics manufacturers. ACV €72K-€96K.",
      "opening": "I want to ask you about something specific before I say anything about us. In the last 18 months, have you had a production halt that started with a supplier running low on a component nobody was tracking?",
      "discovery_questions": [
        "How do you currently know when a Tier 2 or Tier 3 supplier is at risk? Is that real-time or periodic?",
        "When was the last time you found out about a supplier issue too late to act? What happened?",
        "If you could catch a potential halt 4-6 weeks in advance, what would that be worth per incident?"
      ],
      "objection_handling": [
        {
          "objection": "We already have SAP.",
          "response": "SAP is great for your own inventory. But SAP can only see what your Tier 1 suppliers report to you - it has no visibility into what their suppliers are holding. That is exactly where the 67% of production halts we see actually start. Nuvora connects into SAP and adds the Tier 2+ layer that SAP does not have."
        },
        {
          "objection": "Our IT department handles supply chain risk.",
          "response": "IT manages system access - they are not watching your Tier 2 capacitor inventory at 11pm on a Thursday. The VP Procurement at BMW had IT too. They still had the €14M halt. Nuvora is an early warning system that your procurement team reads, not another IT project."
        },
        {
          "objection": "What is the implementation timeline?",
          "response": "We have customers live on day 30. We built a CSV import fallback specifically because SAP/Oracle IT approval cycles can take months. You start getting value in week 1."
        }
      ],
      "close": "Based on what you have told me, a single prevented halt would pay for Nuvora 4-6 times over. The question is not whether it is worth it - it is whether you want to be the person who prevented the next one or the person who explains why it happened again. Shall we agree on a 30-day pilot?"
    }',
    1, NOW()-INTERVAL '6 days', NOW()-INTERVAL '6 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Maya: Brand Messaging
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_m, v_user_id, 'maya', v_conv_m, 'brand_messaging',
    'Nuvora Brand Messaging System',
    '{
      "brand_essence": "The early warning system procurement teams never had.",
      "headlines": [
        "Know before your production halts.",
        "Your suppliers'' suppliers are running low. You just do not know it yet.",
        "The next production halt is already forming. Nuvora shows you where."
      ],
      "tagline": "See every tier. Stop every halt.",
      "tone_of_voice": {
        "personality": ["Direct","Authoritative","Quietly confident"],
        "avoid": ["Hype","Jargon","Feature lists without outcomes"]
      },
      "messaging_pillars": [
        {
          "pillar": "Real-time visibility",
          "proof": "Live inventory data from every supplier tier, updated continuously - not a quarterly risk report.",
          "stat": "67% reduction in unplanned production stoppages in 90 days"
        },
        {
          "pillar": "Integration speed",
          "proof": "Live on your SAP or Oracle in 30 days. CSV import fallback so you get value before IT finishes the approval.",
          "stat": "Typical deployment: 22 days"
        },
        {
          "pillar": "Mid-market native",
          "proof": "Built for €50M-€500M manufacturers. Not an enterprise tool with a mid-market price tag.",
          "stat": "€60K-€96K ACV. No $500K commitments."
        }
      ]
    }',
    1, NOW()-INTERVAL '11 days', NOW()-INTERVAL '11 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Nova: PMF Survey
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_n, v_user_id, 'nova', v_conv_n, 'pmf_survey',
    'Nuvora PMF Survey - Supply Chain Buyers',
    '{
      "survey_title": "Nuvora Product-Market Fit Survey",
      "target_respondents": "VP Procurement / Head of Supply Chain at manufacturers",
      "questions": [
        {
          "id": 1,
          "type": "sean_ellis",
          "text": "How would you feel if you could no longer use Nuvora?",
          "options": ["Very disappointed","Somewhat disappointed","Not disappointed (it is not that useful)","N/A - I no longer use Nuvora"]
        },
        {
          "id": 2,
          "type": "open",
          "text": "What is the main benefit you get from Nuvora?"
        },
        {
          "id": 3,
          "type": "open",
          "text": "What type of person would benefit most from Nuvora?"
        },
        {
          "id": 4,
          "type": "nps",
          "text": "How likely are you to recommend Nuvora to a colleague? (0-10)"
        },
        {
          "id": 5,
          "type": "open",
          "text": "What would most improve Nuvora for you?"
        }
      ],
      "results_preview": {
        "very_disappointed_pct": 62,
        "nps": 54,
        "top_benefit": "Peace of mind - I stop worrying about supplier surprises",
        "top_persona": "VP Procurement at manufacturers with complex Tier 2+ supply chains"
      }
    }',
    1, NOW()-INTERVAL '13 days', NOW()-INTERVAL '13 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Leo: Legal Checklist
  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_l, v_user_id, 'leo', v_conv_l, 'legal_checklist',
    'Nuvora Legal Checklist - Delaware C-Corp',
    '{
      "summary": "Legal setup checklist for Nuvora - Delaware C-Corp, seed stage, DACH operations.",
      "sections": [
        {
          "title": "Entity Formation",
          "items": [
            {"item":"File Certificate of Incorporation in Delaware","status":"done","notes":"Filed Aug 2023 via Stripe Atlas"},
            {"item":"Appoint initial directors","status":"done","notes":"Mehtab Afsar, Aarav Singh"},
            {"item":"Issue founder shares with 4-year vest / 1-year cliff","status":"done","notes":"83A election filed - 90 days deadline met"},
            {"item":"File IRS Form 2553 (S-Corp election) if applicable","status":"n/a","notes":"C-Corp staying as C-Corp for VC funding"}
          ]
        },
        {
          "title": "IP Assignment",
          "items": [
            {"item":"Confirm all IP assigned to company (not founders personally)","status":"done","notes":"CIIA signed by all 4 full-time employees"},
            {"item":"Patent application filed for core algorithm","status":"done","notes":"US Application 18/234,891 filed Aug 2023"}
          ]
        },
        {
          "title": "Seed Round Prep",
          "items": [
            {"item":"Cap table clean and up to date","status":"done","notes":"Carta - 2 founders, 4 angels, 10% option pool"},
            {"item":"SAFE or convertible note terms agreed","status":"in_progress","notes":"Using post-money SAFE, $6M cap, 20% discount"},
            {"item":"Data room prepared for investor diligence","status":"in_progress","notes":"Notion - financial model, customer contracts, IP docs"},
            {"item":"409A valuation completed","status":"pending","notes":"Required before issuing more options"}
          ]
        }
      ]
    }',
    1, NOW()-INTERVAL '15 days', NOW()-INTERVAL '15 days'
  ) ON CONFLICT (id) DO NOTHING;


  -- ── 9. Deals pipeline (Susi) ──────────────────────────────────
  INSERT INTO public.deals (user_id, company, contact_name, contact_email, contact_title,
    stage, value, notes, next_action, next_action_date, source, created_at, updated_at)
  VALUES
    (v_user_id, 'Bosch GmbH', 'Stefan Richter', 'stefan.richter@bosch.com',
     'VP Procurement', 'negotiating', 96000,
     'POC completed. Production halt in Q3 that cost €2.1M - very motivated buyer. Legal review of MSA in progress.',
     'Follow up on MSA redlines from Bosch legal',
     NOW() + INTERVAL '3 days', 'susi_suggested',
     NOW()-INTERVAL '14 days', NOW()-INTERVAL '1 day'),

    (v_user_id, 'Hella SE', 'Karin Wolf', 'k.wolf@hella.com',
     'Head of Supply Chain', 'proposal', 72000,
     'Demo went well. Sent proposal. Waiting on budget approval from CFO. Q1 budget cycle.',
     'Send ROI case study from BMW-tier customer',
     NOW() + INTERVAL '7 days', 'susi_suggested',
     NOW()-INTERVAL '10 days', NOW()-INTERVAL '2 days'),

    (v_user_id, 'Trumpf Group', 'Michael Brenner', 'mbrenner@trumpf.com',
     'Procurement Director', 'qualified', 84000,
     'Warm intro from McKinsey alumni. Had production halt in October - 3 weeks disruption. Very aware of the problem.',
     'Schedule technical demo with CTO and their IT team',
     NOW() + INTERVAL '5 days', 'warm_intro',
     NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days')
  ON CONFLICT DO NOTHING;


  -- ── 10. Tracked competitors (Atlas) ──────────────────────────
  INSERT INTO public.tracked_competitors (user_id, name, url, created_at)
  VALUES
    (v_user_id, 'Resilinc',   'https://resilinc.com',   NOW()-INTERVAL '5 days'),
    (v_user_id, 'project44',  'https://project44.com',  NOW()-INTERVAL '5 days'),
    (v_user_id, 'Interos',    'https://interos.ai',     NOW()-INTERVAL '5 days')
  ON CONFLICT DO NOTHING;


  -- ── 11. Score evidence ────────────────────────────────────────
  INSERT INTO public.score_evidence (id, user_id, dimension, evidence_type, title, data_value, status, points_awarded, created_at) VALUES
    (gen_random_uuid(), v_user_id, 'traction',  'agent_artifact', '6 Paying Enterprise Customers - €38K MRR',            '38000', 'verified', 15, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'product',   'agent_artifact', '87 Customer Discovery Conversations Documented',       '87',    'verified', 12, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'team',      'manual',         'Prior Exit - Supply Chain Analytics Tool Acquired 2021','1',    'verified', 10, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'financial', 'agent_artifact', '82% Gross Margin - Felix Financial Summary',           '82',   'verified',  8, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'market',    'agent_artifact', 'US Patent Filed - Algorithm 18/234,891',               '1',    'verified',  6, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'traction',  'agent_artifact', 'NRR 118% - Customer Expansion Documented',             '118',  'verified',  8, NOW()-INTERVAL '4 days');


  -- ── 12. Agent activity log ────────────────────────────────────
  INSERT INTO public.agent_activity (id, user_id, agent_id, action_type, description, metadata, created_at) VALUES
    (gen_random_uuid(), v_user_id, 'nova',   'artifact_created', 'Generated PMF Survey - Supply Chain Buyers',           '{"artifact_type":"pmf_survey"}',         NOW()-INTERVAL '13 days'),
    (gen_random_uuid(), v_user_id, 'leo',    'artifact_created', 'Generated Legal Checklist - Delaware C-Corp',          '{"artifact_type":"legal_checklist"}',    NOW()-INTERVAL '15 days'),
    (gen_random_uuid(), v_user_id, 'maya',   'artifact_created', 'Generated Brand Messaging System',                     '{"artifact_type":"brand_messaging"}',    NOW()-INTERVAL '11 days'),
    (gen_random_uuid(), v_user_id, 'patel',  'artifact_created', 'Generated GTM Playbook - DACH Enterprise',             '{"artifact_type":"gtm_playbook"}',       NOW()-INTERVAL '9 days'),
    (gen_random_uuid(), v_user_id, 'patel',  'artifact_created', 'Generated ICP Document - VP Procurement DACH',         '{"artifact_type":"icp_document"}',       NOW()-INTERVAL '9 days'),
    (gen_random_uuid(), v_user_id, 'susi',   'artifact_created', 'Generated Enterprise Sales Script',                    '{"artifact_type":"sales_script"}',       NOW()-INTERVAL '6 days'),
    (gen_random_uuid(), v_user_id, 'felix',  'artifact_created', 'Generated 24-Month Financial Model',                   '{"artifact_type":"financial_summary"}',  NOW()-INTERVAL '7 days'),
    (gen_random_uuid(), v_user_id, 'atlas',  'artifact_created', 'Generated Competitive Landscape Matrix',               '{"artifact_type":"competitive_matrix"}', NOW()-INTERVAL '5 days'),
    (gen_random_uuid(), v_user_id, 'harper', 'artifact_created', 'Generated 18-Month Hiring Plan',                       '{"artifact_type":"hiring_plan"}',        NOW()-INTERVAL '4 days'),
    (gen_random_uuid(), v_user_id, 'sage',   'artifact_created', 'Generated 12-Month Strategic OKR Plan',                '{"artifact_type":"strategic_plan"}',     NOW()-INTERVAL '2 days'),
    (gen_random_uuid(), v_user_id, 'patel',  'score_boost',      'GTM score boosted +6 pts from GTM Playbook',           '{"artifact_type":"gtm_playbook","pts":6}',       NOW()-INTERVAL '3 days'),
    (gen_random_uuid(), v_user_id, 'felix',  'score_boost',      'Financial score boosted +6 pts from Financial Summary','{"artifact_type":"financial_summary","pts":6}',  NOW()-INTERVAL '3 days');


  RAISE NOTICE '✓ Seed complete - mehtab@gmail.com / Moon@123 - Nuvora - Q-Score 74 - 9 agents seeded';

END $$;

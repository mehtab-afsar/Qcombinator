-- ============================================================
-- Edge Alpha — Test User Seed
-- User:    mehtab@gmail.com / Moon@123
-- Company: Nuvora (B2B SaaS, supply chain visibility, DACH)
-- Run:     psql -U postgres -d postgres -f seed.sql
-- ============================================================

-- Expand constraints that are too narrow for seed data
ALTER TABLE public.agent_artifacts
  DROP CONSTRAINT IF EXISTS agent_artifacts_artifact_type_check;

ALTER TABLE public.agent_artifacts
  ADD CONSTRAINT agent_artifacts_artifact_type_check CHECK (artifact_type IN (
    'icp_document','outreach_sequence','battle_card','gtm_playbook',
    'financial_summary','competitive_matrix','hiring_plan','pmf_survey',
    'brand_messaging','sales_script','strategic_plan','interview_notes',
    'legal_checklist'
  ));

ALTER TABLE public.qscore_history
  DROP CONSTRAINT IF EXISTS qscore_history_data_source_check;

ALTER TABLE public.qscore_history
  ADD CONSTRAINT qscore_history_data_source_check CHECK (data_source IN (
    'onboarding','assessment','combined','agent_completion','agent_artifact','manual'
  ));


-- ── Main seed block ──────────────────────────────────────────
DO $$
DECLARE
  v_user_id   UUID;
  v_score_1   UUID := 'a1b2c3d4-0000-0000-0000-000000000010';
  v_score_2   UUID := 'a1b2c3d4-0000-0000-0000-000000000011';
  v_score_3   UUID := 'a1b2c3d4-0000-0000-0000-000000000012';
  v_conv_p    UUID := 'a1b2c3d4-0000-0000-0000-000000000020';
  v_conv_f    UUID := 'a1b2c3d4-0000-0000-0000-000000000021';
  v_conv_a    UUID := 'a1b2c3d4-0000-0000-0000-000000000022';
  v_conv_h    UUID := 'a1b2c3d4-0000-0000-0000-000000000023';
  v_conv_s    UUID := 'a1b2c3d4-0000-0000-0000-000000000024';
  v_art_p     UUID := 'a1b2c3d4-0000-0000-0000-000000000030';
  v_art_f     UUID := 'a1b2c3d4-0000-0000-0000-000000000031';
  v_art_a     UUID := 'a1b2c3d4-0000-0000-0000-000000000032';
  v_art_h     UUID := 'a1b2c3d4-0000-0000-0000-000000000033';
  v_art_sg    UUID := 'a1b2c3d4-0000-0000-0000-000000000034';
BEGIN

  -- ── 1. Auth user (get-or-create) ──────────────────────────
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
      NOW() - INTERVAL '20 days', NOW(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at, provider_id
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'mehtab@gmail.com'),
      'email', NOW(), NOW() - INTERVAL '20 days', NOW(),
      'mehtab@gmail.com'
    );

    RAISE NOTICE 'Created new user: %', v_user_id;
  ELSE
    -- Update password for existing user
    UPDATE auth.users
      SET encrypted_password = crypt('Moon@123', gen_salt('bf')),
          email_confirmed_at  = COALESCE(email_confirmed_at, NOW()),
          updated_at          = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'Using existing user: %', v_user_id;
  END IF;


  -- ── 2. Founder profile ────────────────────────────────────
  INSERT INTO public.founder_profiles (
    user_id, full_name, startup_name, industry, stage,
    subscription_tier, onboarding_completed, assessment_completed,
    created_at, updated_at
  ) VALUES (
    v_user_id, 'Mehtab Afsar', 'Nuvora', 'B2B SaaS', 'mvp',
    'premium', true, true,
    NOW() - INTERVAL '20 days', NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET startup_name         = EXCLUDED.startup_name,
        industry             = EXCLUDED.industry,
        stage                = EXCLUDED.stage,
        subscription_tier    = EXCLUDED.subscription_tier,
        onboarding_completed = EXCLUDED.onboarding_completed,
        assessment_completed = EXCLUDED.assessment_completed,
        updated_at           = NOW();


  -- ── 3. Q-Score history (3-row audit chain) ────────────────

  -- Row 1: Onboarding (5 questions, partial)
  INSERT INTO public.qscore_history (
    id, user_id, overall_score, market_score, product_score,
    gtm_score, financial_score, team_score, traction_score,
    percentile, grade, data_source, previous_score_id,
    assessment_data, calculated_at
  ) VALUES (
    v_score_1, v_user_id,
    41, 35, 48, 28, 22, 72, 38,
    32, 'D', 'onboarding', NULL,
    '{
      "problemStory": "I spent 6 years as a supply chain consultant at McKinsey. I watched a Tier-1 BMW supplier miss a shipment because their Tier-2 supplier ran out of a $0.03 capacitor that nobody tracked. That single miss cost BMW €14M in halted production.",
      "advantages": ["6 years at McKinsey in supply chain practice","Deep relationships with procurement heads at 40+ manufacturers","Built and sold a supply chain analytics tool (acquired 2021)"],
      "customerQuote": "We had a $4M production halt in Q3 because nobody flagged that our Indonesian capacitor supplier had 3 days of stock left. If Nuvora had been live, we would have caught that 6 weeks earlier.",
      "conversationCount": 87,
      "customerCommitment": "paid",
      "hardshipStory": "Our first enterprise pilot, a €180K contract, pulled out 3 days before go-live. We had 11 days of runway. I personally guaranteed a bridging loan to make payroll. We came back with 2 new pilots within 6 weeks."
    }',
    NOW() - INTERVAL '18 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Row 2: Full assessment (all 7 topics)
  INSERT INTO public.qscore_history (
    id, user_id, overall_score, market_score, product_score,
    gtm_score, financial_score, team_score, traction_score,
    percentile, grade, data_source, previous_score_id,
    assessment_data, ai_actions, calculated_at
  ) VALUES (
    v_score_2, v_user_id,
    68, 72, 74, 65, 58, 81, 62,
    61, 'C+', 'assessment', v_score_1,
    '{
      "problemStory": "I spent 6 years as a supply chain consultant at McKinsey. I watched a Tier-1 BMW supplier miss a shipment because their Tier-2 supplier ran out of a $0.03 capacitor — a part nobody tracked. That single miss cost BMW €14M.",
      "advantages": ["6 years at McKinsey in supply chain practice","Deep relationships with procurement heads at 40+ manufacturers","Prior exit — supply chain analytics tool acquired 2021"],
      "advantageExplanation": "I have the domain depth, the network, and the prior exit. No VC-backed competitor has a founder who has actually sat inside procurement departments.",
      "customerQuote": "We had a $4M production halt in Q3 because nobody flagged that our Indonesian capacitor supplier had 3 days of stock left.",
      "conversationCount": 87,
      "customerCommitment": "paid",
      "customerSurprise": "Customers do not want more dashboards — they want automated Slack alerts so they never have to log in.",
      "failedBelief": "I thought procurement teams would pay for visibility. They actually pay for risk prevention. The reframe changed our entire pricing model.",
      "hardshipStory": "Our first enterprise pilot pulled out 3 days before go-live. We had 11 days of runway. I personally guaranteed a bridging loan to make payroll. We came back with 2 new pilots in 6 weeks.",
      "targetCustomers": 8500,
      "conversionRate": 2.1,
      "lifetimeValue": 85000,
      "costPerAcquisition": 12000,
      "icpDescription": "VP of Procurement or Head of Supply Chain at mid-market manufacturers (200–2000 employees, €50M–€500M revenue) in automotive, electronics, and industrial equipment in DACH and Benelux who experienced at least one production halt in the last 18 months.",
      "channelsTried": ["LinkedIn outbound","Hannover Messe","McKinsey alumni network","supply chain risk whitepaper"],
      "currentCAC": 12000,
      "mrr": 38000,
      "monthlyBurn": 52000,
      "runway": 14,
      "buildTime": 8,
      "tested": "ERP integration connectors, real-time alert threshold engine, risk scoring model",
      "results": "Customers reduced unplanned production stoppages by 67% in first 90 days",
      "learned": "API integrations with SAP and Oracle take 3x longer than expected due to enterprise IT approval cycles",
      "changed": "Built a lightweight CSV import fallback so customers get value on day 1 without waiting for IT"
    }',
    '{
      "actions": [
        {"title":"Nail your SAM with a bottom-up model","description":"Your TAM is strong but investors will drill on SAM. Build a bottom-up model from LinkedIn company counts in DACH + Benelux.","dimension":"market","impact":"+6 points","agentId":"atlas","agentName":"Atlas","timeframe":"1 week"},
        {"title":"Document your ICP with a named-customer matrix","description":"Your ICP description is good but needs quantified firmographic attributes. Map your 6 paying customers.","dimension":"goToMarket","impact":"+5 points","agentId":"patel","agentName":"Patel","timeframe":"3 days"},
        {"title":"Build a 24-month financial model","description":"ARR and runway are solid but no documented projections. Investors need a model, not just a number.","dimension":"financial","impact":"+8 points","agentId":"felix","agentName":"Felix","timeframe":"1 week"}
      ]
    }',
    NOW() - INTERVAL '10 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- Row 3: Post-artifact boosts (+6 GTM, +6 Financial)
  INSERT INTO public.qscore_history (
    id, user_id, overall_score, market_score, product_score,
    gtm_score, financial_score, team_score, traction_score,
    percentile, grade, data_source, source_artifact_type,
    previous_score_id, assessment_data, calculated_at
  ) VALUES (
    v_score_3, v_user_id,
    74, 72, 74, 71, 64, 81, 62,
    67, 'C+', 'agent_artifact', 'financial_summary',
    v_score_2,
    '{"mrr":38000,"monthlyBurn":52000,"runway":14,"conversationCount":87,"customerCommitment":"paid"}',
    NOW() - INTERVAL '3 days'
  ) ON CONFLICT (id) DO NOTHING;


  -- ── 4. Agent conversations ────────────────────────────────
  INSERT INTO public.agent_conversations (id, user_id, agent_id, title, message_count, last_message_at, created_at)
  VALUES
    (v_conv_p, v_user_id, 'patel',  'GTM Strategy for Nuvora',                         8, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'),
    (v_conv_f, v_user_id, 'felix',  'Financial Model & Runway Analysis',               8, NOW()-INTERVAL '7 days', NOW()-INTERVAL '7 days'),
    (v_conv_a, v_user_id, 'atlas',  'Competitive Landscape — Supply Chain Visibility', 8, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days'),
    (v_conv_h, v_user_id, 'harper', 'Hiring Plan — Engineering & Sales',               6, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'),
    (v_conv_s, v_user_id, 'sage',   '12-Month Strategic Plan',                         6, NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days')
  ON CONFLICT (id) DO NOTHING;


  -- ── 5. Agent messages ─────────────────────────────────────

  -- Patel (GTM)
  INSERT INTO public.agent_messages (id, conversation_id, user_id, role, content, created_at) VALUES
    (gen_random_uuid(), v_conv_p, v_user_id, 'user',
     'I need help building our GTM strategy. We are targeting VP Procurement at mid-market manufacturers in DACH. We have 6 paying customers at €5K–€8K MRR each.',
     NOW()-INTERVAL '9 days'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'assistant',
     'Great foundation. With 6 paying customers you have real signal. Are you seeing better conversion in Germany, Austria or Switzerland? And are your 6 customers coming from inbound or outbound?',
     NOW()-INTERVAL '9 days'+INTERVAL '3 min'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'user',
     '5 out of 6 came from warm intros through my McKinsey network. 1 from LinkedIn. Germany is 4 out of 6.',
     NOW()-INTERVAL '9 days'+INTERVAL '6 min'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'assistant',
     'Your traction is network-driven — great for validation, not yet scalable. Near-term: systematise the warm intro engine. Map your McKinsey alumni network to procurement roles and build a structured referral programme. Medium-term: publish anonymised supply chain risk data from your platform as quarterly reports and use them as LinkedIn outbound door-openers. Shall I build the full GTM Playbook?',
     NOW()-INTERVAL '9 days'+INTERVAL '9 min'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'user',
     'Yes please build the full playbook.',
     NOW()-INTERVAL '9 days'+INTERVAL '12 min'),
    (gen_random_uuid(), v_conv_p, v_user_id, 'assistant',
     'Building your GTM Playbook now...',
     NOW()-INTERVAL '9 days'+INTERVAL '13 min');

  -- Felix (Financial)
  INSERT INTO public.agent_messages (id, conversation_id, user_id, role, content, created_at) VALUES
    (gen_random_uuid(), v_conv_f, v_user_id, 'user',
     'Felix, I need to model our financials. €38K MRR, €52K monthly burn, 14 months runway, 60–90 day enterprise sales cycle.',
     NOW()-INTERVAL '7 days'),
    (gen_random_uuid(), v_conv_f, v_user_id, 'assistant',
     'Good starting point. Are these annual contracts paid upfront, and what is your ACV range? Also, do you have any deals close to closing?',
     NOW()-INTERVAL '7 days'+INTERVAL '3 min'),
    (gen_random_uuid(), v_conv_f, v_user_id, 'user',
     'Annual contracts paid upfront, €60K–€96K ACV. 4 of us full time. 3 pipeline deals ~€220K total ACV expected to close in 45 days.',
     NOW()-INTERVAL '7 days'+INTERVAL '6 min'),
    (gen_random_uuid(), v_conv_f, v_user_id, 'assistant',
     'This is stronger than the headline numbers suggest. Current ARR is €456K. With pipeline closed, ARR jumps to €676K and you get a €220K upfront cash injection extending runway to 18–20 months. The real risk is deal slippage — I will model a conservative (2 of 3 close, 30-day slip) and optimistic scenario. Building your 24-month financial model now...',
     NOW()-INTERVAL '7 days'+INTERVAL '9 min');

  -- Atlas (Competitive)
  INSERT INTO public.agent_messages (id, conversation_id, user_id, role, content, created_at) VALUES
    (gen_random_uuid(), v_conv_a, v_user_id, 'user',
     'Atlas, who are our main competitors in supply chain visibility? Need a competitive matrix for investor decks.',
     NOW()-INTERVAL '5 days'),
    (gen_random_uuid(), v_conv_a, v_user_id, 'assistant',
     'Pulling live competitive data on the supply chain visibility market...',
     NOW()-INTERVAL '5 days'+INTERVAL '3 min'),
    (gen_random_uuid(), v_conv_a, v_user_id, 'user',
     'What is our positioning vs project44 and Resilinc?',
     NOW()-INTERVAL '5 days'+INTERVAL '6 min'),
    (gen_random_uuid(), v_conv_a, v_user_id, 'assistant',
     'project44 is enterprise-only ($500K+ ACV) focused on logistics tracking — not multi-tier supplier inventory. Resilinc is your closest real competitor but US-focused, $200K+ ACV, and does risk intelligence rather than live inventory. Your positioning: only mid-market-native option in DACH with ERP integration in under 30 days. Shall I build the full competitive matrix?',
     NOW()-INTERVAL '5 days'+INTERVAL '9 min'),
    (gen_random_uuid(), v_conv_a, v_user_id, 'user',
     'Yes build it.',
     NOW()-INTERVAL '5 days'+INTERVAL '12 min');


  -- ── 6. Agent artifacts ────────────────────────────────────

  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_p, v_user_id, 'patel', v_conv_p, 'gtm_playbook',
    'Nuvora GTM Playbook — DACH Enterprise',
    '{
      "summary": "Go-to-market strategy for Nuvora targeting VP Procurement at mid-market manufacturers (200–2000 employees) in DACH.",
      "icp": {
        "title": "VP Procurement / Head of Supply Chain",
        "company_size": "200–2000 employees",
        "revenue": "€50M–€500M",
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
        "subheadline": "Nuvora gives procurement teams live visibility into every tier of their supplier network — so you catch shortages weeks before they become stoppages.",
        "proof_point": "Nuvora customers reduced unplanned production halts by 67% in their first 90 days."
      },
      "execution_plan": [
        {"week":"1–2","action":"Map McKinsey alumni network to target company procurement roles"},
        {"week":"3–4","action":"Launch customer referral programme — 10% discount per successful intro"},
        {"week":"5–8","action":"Publish Q1 Supply Chain Risk Report, use as LinkedIn outbound opener"},
        {"week":"9–12","action":"Close 3 pipeline deals, document case studies for Hannover Messe"}
      ]
    }',
    1, NOW()-INTERVAL '9 days', NOW()-INTERVAL '9 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_f, v_user_id, 'felix', v_conv_f, 'financial_summary',
    'Nuvora 24-Month Financial Model',
    '{
      "current_metrics": {"mrr":38000,"arr":456000,"monthly_burn":52000,"runway_months":14,"gross_margin_pct":82,"acv":78000,"customers":6},
      "pipeline": {"deals":3,"total_acv":220000,"expected_close":"45 days","conservative":"2 of 3 close, 30-day slip"},
      "projections": {
        "month_6":  {"mrr":68000, "arr":816000, "customers":12,"burn":58000},
        "month_12": {"mrr":112000,"arr":1344000,"customers":18,"burn":74000},
        "month_18": {"mrr":165000,"arr":1980000,"customers":26,"burn":95000},
        "month_24": {"mrr":230000,"arr":2760000,"customers":34,"burn":120000}
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

  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_a, v_user_id, 'atlas', v_conv_a, 'competitive_matrix',
    'Supply Chain Visibility — Competitive Landscape',
    '{
      "summary": "Nuvora operates in the supply chain visibility market. The mid-market DACH segment is underserved by current enterprise-focused players.",
      "competitors": [
        {"name":"project44","funding":"$900M","focus":"Transportation & logistics visibility","acv":"$500K+","weakness":"No multi-tier supplier inventory; US-centric","threat_level":"low"},
        {"name":"Resilinc","funding":"$60M","focus":"Supplier risk monitoring","acv":"$200K+","weakness":"Risk intelligence only — no live inventory; US-focused","threat_level":"medium"},
        {"name":"Interos","funding":"$115M","focus":"Supply chain risk intelligence","acv":"$150K+","weakness":"No operational inventory data; different buyer","threat_level":"low"}
      ],
      "nuvora_advantages": [
        "Only mid-market-native product in DACH (sub-€100K ACV)",
        "ERP integration live in under 30 days vs 6–12 months for enterprise tools",
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

  INSERT INTO public.agent_artifacts (id, user_id, agent_id, conversation_id, artifact_type, title, content, version, created_at, updated_at)
  VALUES (
    v_art_h, v_user_id, 'harper', v_conv_h, 'hiring_plan',
    'Nuvora Hiring Plan — 18-Month Roadmap',
    '{
      "current_team": [
        {"role":"CEO / Co-founder","name":"Mehtab Afsar","background":"McKinsey supply chain, prior exit"},
        {"role":"CTO / Co-founder","name":"Aarav Singh","background":"10 yrs enterprise integration, ex-SAP"},
        {"role":"Head of Sales","name":"Lars Mueller","background":"5 yrs B2B SaaS sales, DACH market"},
        {"role":"Lead Engineer","name":"Priya Nair","background":"Full-stack, ERP integration specialist"}
      ],
      "hiring_plan": [
        {"role":"Enterprise Account Executive (DACH)","priority":"high","timeline":"Month 1–2","rationale":"CEO closing all deals — needs sales capacity","comp":"€90K base + €60K OTE","requirements":["5+ yrs B2B SaaS AE","German native speaker","Manufacturing sector preferred"]},
        {"role":"Senior Backend Engineer","priority":"high","timeline":"Month 2–3","rationale":"ERP integration backlog at capacity","comp":"€100K–€120K","requirements":["4+ yrs backend","SAP/Oracle integration","Distributed systems"]},
        {"role":"Customer Success Manager","priority":"medium","timeline":"Month 4–5","rationale":"6 customers managed manually — churn risk at scale","comp":"€70K–€85K","requirements":["3+ yrs CS in B2B SaaS","Manufacturing background preferred"]}
      ],
      "total_headcount_target": 8,
      "total_comp_budget_monthly": 78000
    }',
    1, NOW()-INTERVAL '4 days', NOW()-INTERVAL '4 days'
  ) ON CONFLICT (id) DO NOTHING;

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
          "objective": "Close Seed round — extend runway to 28 months",
          "quarter": "Q2 2026",
          "key_results": [
            {"kr":"Raise €2.5M Seed from 1–2 lead investors","owner":"CEO","status":"in_progress"},
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


  -- ── 7. Score evidence ─────────────────────────────────────
  INSERT INTO public.score_evidence (id, user_id, dimension, evidence_type, title, data_value, status, points_awarded, created_at) VALUES
    (gen_random_uuid(), v_user_id, 'traction',  'agent_artifact', '6 Paying Enterprise Customers — €38K MRR',           '38000', 'verified', 15, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'product',   'agent_artifact', '87 Customer Discovery Conversations Documented',      '87',    'verified', 12, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'team',      'manual',         'Prior Exit — Supply Chain Analytics Tool Acquired 2021','1',   'verified', 10, NOW()-INTERVAL '8 days'),
    (gen_random_uuid(), v_user_id, 'financial', 'agent_artifact', '82% Gross Margin — Felix Financial Summary',          '82',   'verified',  8, NOW()-INTERVAL '8 days');


  -- ── 8. Agent activity log ─────────────────────────────────
  INSERT INTO public.agent_activity (id, user_id, agent_id, action_type, description, metadata, created_at) VALUES
    (gen_random_uuid(), v_user_id, 'patel',  'artifact_created', 'Generated GTM Playbook — DACH Enterprise',            '{"artifact_type":"gtm_playbook"}',       NOW()-INTERVAL '9 days'),
    (gen_random_uuid(), v_user_id, 'felix',  'artifact_created', 'Generated 24-Month Financial Model',                  '{"artifact_type":"financial_summary"}',  NOW()-INTERVAL '7 days'),
    (gen_random_uuid(), v_user_id, 'atlas',  'artifact_created', 'Generated Competitive Landscape Matrix',              '{"artifact_type":"competitive_matrix"}', NOW()-INTERVAL '5 days'),
    (gen_random_uuid(), v_user_id, 'harper', 'artifact_created', 'Generated 18-Month Hiring Plan',                      '{"artifact_type":"hiring_plan"}',        NOW()-INTERVAL '4 days'),
    (gen_random_uuid(), v_user_id, 'sage',   'artifact_created', 'Generated 12-Month Strategic OKR Plan',               '{"artifact_type":"strategic_plan"}',     NOW()-INTERVAL '2 days'),
    (gen_random_uuid(), v_user_id, 'patel',  'score_boost',      'GTM score boosted +6 pts from GTM Playbook',          '{"artifact_type":"gtm_playbook","pts":6}',       NOW()-INTERVAL '3 days'),
    (gen_random_uuid(), v_user_id, 'felix',  'score_boost',      'Financial score boosted +6 pts from Financial Summary','{"artifact_type":"financial_summary","pts":6}',  NOW()-INTERVAL '3 days');


  RAISE NOTICE '✓ Seed complete — mehtab@gmail.com / Moon@123 — Nuvora — Q-Score 74';

END $$;

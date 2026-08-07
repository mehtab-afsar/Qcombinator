-- ============================================================
-- Scrub plaintext PostHog/Calendly/Fireflies keys
--
-- app/api/integrations/connect/route.ts wrote a founder's own PostHog/Calendly/
-- Fireflies API key straight into founder_profiles in plaintext — a direct
-- violation of CLAUDE.md §3 ("Secrets by reference only ... never plaintext").
-- Nothing ever read these columns to actually call PostHog/Calendly/Fireflies
-- (confirmed by search), so this was pure exposure with no working feature
-- behind it. The route and its Settings UI are removed in this same change;
-- this clears out anything that was already written before a proper
-- vault-backed connector replaces it.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'founder_profiles'
               AND column_name = 'posthog_api_key') THEN
    UPDATE founder_profiles SET posthog_api_key = NULL WHERE posthog_api_key IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'founder_profiles'
               AND column_name = 'calendly_api_key') THEN
    UPDATE founder_profiles SET calendly_api_key = NULL WHERE calendly_api_key IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'founder_profiles'
               AND column_name = 'fireflies_api_key') THEN
    UPDATE founder_profiles SET fireflies_api_key = NULL WHERE fireflies_api_key IS NOT NULL;
  END IF;
END $$;

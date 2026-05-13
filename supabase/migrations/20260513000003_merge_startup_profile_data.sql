-- Safely merges a JSONB patch into founder_profiles.startup_profile_data
-- without overwriting existing fields.
-- Used by the post-signup onboarding text enrichment flow.

CREATE OR REPLACE FUNCTION merge_startup_profile_data(
  p_user_id UUID,
  p_patch   JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE founder_profiles
  SET startup_profile_data = COALESCE(startup_profile_data, '{}'::jsonb) || p_patch
  WHERE user_id = p_user_id;
END;
$$;

-- ============================================================
-- Harden merge_startup_profile_data / upsert_profile_builder_sections
--
-- Both functions take p_user_id as a plain argument and write to that user's
-- founder_profiles / profile_builder_data row without ever checking that the
-- caller IS that user. Both are SECURITY DEFINER (bypasses RLS), and
-- upsert_profile_builder_sections is explicitly GRANTed to `authenticated` —
-- so any logged-in user could call either via PostgREST RPC with someone
-- else's user id and overwrite their profile/onboarding data.
--
-- The app's only real callers (lib/founder/complete-onboarding.ts,
-- app/api/profile-builder/upload/route.ts) always call these through the
-- service-role client, with p_user_id already resolved server-side from a
-- verified session — so `service_role` stays trusted as before. What's new
-- is that an `authenticated`-role caller must now be acting on their own
-- user id, and `anon` is rejected outright.
-- ============================================================

CREATE OR REPLACE FUNCTION merge_startup_profile_data(
  p_user_id UUID,
  p_patch   JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (
    auth.role() = 'service_role'
    OR (auth.role() = 'authenticated' AND auth.uid() = p_user_id)
  ) THEN
    RAISE EXCEPTION 'not authorized to modify this profile';
  END IF;

  UPDATE founder_profiles
  SET startup_profile_data = COALESCE(startup_profile_data, '{}'::jsonb) || p_patch
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_profile_builder_sections(
  p_user_id UUID,
  p_sections JSONB[]  -- Array of section objects {section, extracted_fields, confidence_map, completion_score, uploaded_documents}
)
RETURNS TABLE (
  section_num INTEGER,
  success BOOLEAN,
  error_msg TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_section JSONB;
BEGIN
  IF NOT (
    auth.role() = 'service_role'
    OR (auth.role() = 'authenticated' AND auth.uid() = p_user_id)
  ) THEN
    RAISE EXCEPTION 'not authorized to modify this profile';
  END IF;

  FOREACH v_section IN ARRAY p_sections LOOP
    INSERT INTO profile_builder_data (
      user_id,
      section,
      raw_conversation,
      extracted_fields,
      confidence_map,
      completion_score,
      uploaded_documents,
      updated_at
    )
    VALUES (
      p_user_id,
      (v_section->>'section')::INTEGER,
      '',
      v_section->'extracted_fields',
      v_section->'confidence_map',
      (v_section->>'completion_score')::NUMERIC,
      (v_section->'uploaded_documents')::JSONB[],
      NOW()
    )
    ON CONFLICT (user_id, section)
    DO UPDATE SET
      extracted_fields = EXCLUDED.extracted_fields,
      confidence_map = EXCLUDED.confidence_map,
      completion_score = EXCLUDED.completion_score,
      uploaded_documents = profile_builder_data.uploaded_documents || EXCLUDED.uploaded_documents,
      updated_at = NOW();

    -- Return success for this section
    RETURN QUERY SELECT
      (v_section->>'section')::INTEGER,
      true,
      NULL::TEXT;
  END LOOP;

  EXCEPTION WHEN OTHERS THEN
    -- Return error (transaction will rollback all changes)
    RETURN QUERY SELECT
      NULL::INTEGER,
      false,
      SQLERRM;
END;
$$;

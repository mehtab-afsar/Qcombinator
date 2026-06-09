-- ============================================================
-- Migration: Add RPC for atomic profile_builder_data upserts
-- ============================================================

-- Create RPC function to upsert multiple profile_builder_data rows atomically
-- Ensures all sections upsert together or all fail together (no orphaned sections)
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
  -- Begin transaction (implicit in function)
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

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_profile_builder_sections(UUID, JSONB[]) TO authenticated;

-- Comment for clarity
COMMENT ON FUNCTION upsert_profile_builder_sections
  IS 'Atomically upsert multiple profile_builder_data sections. All sections update together or transaction rolls back.';

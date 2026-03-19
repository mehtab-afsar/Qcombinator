-- Efficient percentile calculation using a single SQL query.
-- Replaces the JS-side full table scan + in-memory dedup in calculatePercentile().
--
-- Strategy: DISTINCT ON gets the latest score per user, then count those below the target.

CREATE OR REPLACE FUNCTION compute_qscore_percentile(target_score INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH latest_per_user AS (
    SELECT DISTINCT ON (user_id) overall_score
    FROM   qscore_history
    ORDER  BY user_id, calculated_at DESC
  ),
  counts AS (
    SELECT
      COUNT(*)                                        AS total,
      COUNT(*) FILTER (WHERE overall_score < target_score) AS below
    FROM latest_per_user
  )
  SELECT
    CASE
      WHEN total = 0 THEN 50
      ELSE ROUND((below::NUMERIC / total) * 100)::INTEGER
    END
  FROM counts;
$$;

-- Only callable from authenticated sessions + service role
REVOKE ALL ON FUNCTION compute_qscore_percentile(INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION compute_qscore_percentile(INTEGER) TO authenticated;
GRANT  EXECUTE ON FUNCTION compute_qscore_percentile(INTEGER) TO service_role;

-- Returns the single latest qscore_history row per user from a given set of user_ids.
-- Uses DISTINCT ON to eliminate JavaScript-side deduplication in the deal-flow route.
-- Reduces fetched rows from userIds.length × 5 (up to 250) to exactly userIds.length.
CREATE OR REPLACE FUNCTION get_latest_qscores(user_ids uuid[])
RETURNS TABLE(
  user_id        uuid,
  overall_score  integer,
  p1_score       integer,
  p2_score       integer,
  p3_score       integer,
  p4_score       integer,
  p5_score       integer,
  p6_score       integer,
  percentile     numeric,
  calculated_at  timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (user_id)
    user_id, overall_score,
    p1_score, p2_score, p3_score, p4_score, p5_score, p6_score,
    percentile, calculated_at
  FROM qscore_history
  WHERE user_id = ANY(user_ids)
  ORDER BY user_id, calculated_at DESC;
$$;

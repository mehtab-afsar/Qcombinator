-- Unique constraint so ON CONFLICT works in the RPC below
ALTER TABLE subscription_usage
  ADD CONSTRAINT uq_subscription_usage_user_feature UNIQUE (user_id, feature);

-- Atomic usage check + increment with row-level lock.
-- Handles: missing row (auto-inserts with default limit), reset window expiry, and limit check.
-- Returns: allowed BOOL, remaining INT, usage_id UUID.
CREATE OR REPLACE FUNCTION increment_usage_if_allowed(
  p_user_id UUID,
  p_feature TEXT
) RETURNS TABLE(allowed BOOLEAN, remaining INT, usage_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
  v_row    subscription_usage%ROWTYPE;
  v_limit  INT;
  v_next   TIMESTAMPTZ;
BEGIN
  -- Ensure row exists before locking (INSERT is outside the lock; ON CONFLICT makes it idempotent)
  INSERT INTO subscription_usage (user_id, feature, usage_count, limit_count, reset_at)
  VALUES (
    p_user_id,
    p_feature,
    0,
    50,
    date_trunc('month', NOW()) + INTERVAL '1 month'
  )
  ON CONFLICT (user_id, feature) DO NOTHING;

  -- Acquire row-level lock — prevents TOCTOU race between concurrent requests
  SELECT * INTO v_row
    FROM subscription_usage
    WHERE user_id = p_user_id AND feature = p_feature
    FOR UPDATE;

  IF NOT FOUND THEN
    -- Should never happen after the INSERT above, but fail-open
    RETURN QUERY SELECT true, 50::INT, NULL::UUID;
    RETURN;
  END IF;

  -- Reset window expired — zero the counter before checking
  IF v_row.reset_at IS NOT NULL AND v_row.reset_at <= NOW() THEN
    v_next := date_trunc('month', NOW()) + INTERVAL '1 month';
    UPDATE subscription_usage SET usage_count = 0, reset_at = v_next WHERE id = v_row.id;
    v_row.usage_count := 0;
  END IF;

  v_limit := COALESCE(v_row.limit_count, 50);

  IF v_row.usage_count >= v_limit THEN
    RETURN QUERY SELECT false, 0::INT, v_row.id;
    RETURN;
  END IF;

  UPDATE subscription_usage SET usage_count = usage_count + 1 WHERE id = v_row.id;

  RETURN QUERY SELECT true, (v_limit - v_row.usage_count - 1)::INT, v_row.id;
END;
$$;

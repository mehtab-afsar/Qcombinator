-- Atomic, capacity-safe workshop registration.
--
-- Mirrors increment_usage_if_allowed (20260512000003_increment_usage_rpc.sql) exactly:
-- SELECT ... FOR UPDATE row-lock, then check-and-mutate inside that lock, so two concurrent
-- requests for the last spot cannot both succeed. Called via the admin/service-role client —
-- the caller's identity is already verified server-side (verifyAuth()) before p_founder_id
-- is passed in.
--
-- RETURNS TABLE column is named remaining_spots, not spots_left — matching
-- increment_usage_if_allowed's own convention of never reusing the table's own column name
-- for an OUT parameter: PL/pgSQL creates an implicit variable per RETURNS TABLE column, in
-- scope for the whole function body, and a bare `spots_left` inside `UPDATE academy_workshops
-- SET spots_left = spots_left - 1` becomes genuinely ambiguous between that variable and the
-- table column of the same name (verified live: this exact collision throws
-- "column reference is ambiguous" at call time — caught by actually exercising the RPC, not
-- just reading it).

CREATE OR REPLACE FUNCTION register_for_workshop(
  p_workshop_id TEXT,
  p_founder_id  UUID
) RETURNS TABLE(success BOOLEAN, reason TEXT, remaining_spots INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_workshop academy_workshops%ROWTYPE;
  v_existing academy_event_registrations%ROWTYPE;
BEGIN
  -- Lock the workshop row for the duration of the transaction — the check and the mutation
  -- below happen inside this lock, so a concurrent caller serializes behind it.
  SELECT * INTO v_workshop FROM academy_workshops WHERE id = p_workshop_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, 0; RETURN;
  END IF;

  SELECT * INTO v_existing FROM academy_event_registrations
    WHERE workshop_id = p_workshop_id AND founder_id = p_founder_id;

  IF FOUND AND v_existing.status = 'registered' THEN
    -- Idempotent — already registered, no capacity change.
    RETURN QUERY SELECT true, 'already_registered'::TEXT, v_workshop.spots_left; RETURN;
  END IF;

  IF v_workshop.spots_left <= 0 THEN
    RETURN QUERY SELECT false, 'full'::TEXT, 0; RETURN;
  END IF;

  INSERT INTO academy_event_registrations (workshop_id, founder_id, status, created_at, cancelled_at)
  VALUES (p_workshop_id, p_founder_id, 'registered', now(), NULL)
  ON CONFLICT (workshop_id, founder_id)
  DO UPDATE SET status = 'registered', cancelled_at = NULL, created_at = now();

  UPDATE academy_workshops
    SET registered = registered + 1, spots_left = spots_left - 1
    WHERE id = p_workshop_id;

  RETURN QUERY SELECT true, 'ok'::TEXT, (v_workshop.spots_left - 1);
END;
$$;

CREATE OR REPLACE FUNCTION unregister_from_workshop(
  p_workshop_id TEXT,
  p_founder_id  UUID
) RETURNS TABLE(success BOOLEAN, reason TEXT, remaining_spots INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_workshop academy_workshops%ROWTYPE;
  v_existing academy_event_registrations%ROWTYPE;
BEGIN
  SELECT * INTO v_workshop FROM academy_workshops WHERE id = p_workshop_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, 0; RETURN;
  END IF;

  SELECT * INTO v_existing FROM academy_event_registrations
    WHERE workshop_id = p_workshop_id AND founder_id = p_founder_id;

  IF NOT FOUND OR v_existing.status <> 'registered' THEN
    -- Idempotent — nothing to undo.
    RETURN QUERY SELECT true, 'not_registered'::TEXT, v_workshop.spots_left; RETURN;
  END IF;

  UPDATE academy_event_registrations
    SET status = 'cancelled', cancelled_at = now()
    WHERE workshop_id = p_workshop_id AND founder_id = p_founder_id;

  UPDATE academy_workshops
    SET registered = GREATEST(registered - 1, 0),
        spots_left = LEAST(spots_left + 1, capacity)
    WHERE id = p_workshop_id;

  RETURN QUERY SELECT true, 'ok'::TEXT, LEAST(v_workshop.spots_left + 1, v_workshop.capacity);
END;
$$;

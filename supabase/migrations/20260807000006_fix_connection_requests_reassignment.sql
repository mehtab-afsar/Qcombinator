-- ============================================================
-- connection_requests: stop a party from reassigning a request to
-- someone else's account
--
-- The UPDATE policy only checked "are you one of the two parties on this
-- row" — it had no separate check on what the row is allowed to become.
-- Postgres reuses the USING clause as the check for the new row when a
-- policy has no WITH CHECK, which isn't enough here: an investor updating
-- their own row could change founder_id to a different founder entirely,
-- because their own investor_id staying put still satisfies
-- "auth.uid() = investor_id" on the new row.
--
-- RLS policies can't compare the new row against the old row directly, so
-- the actual enforcement is a trigger: founder_id / investor_id /
-- demo_investor_id become immutable after the row is created. Everything
-- else on the row (status, personal_message, updated_at, ...) can still be
-- updated freely by either party, same as before.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_connection_request_reassignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.founder_id IS DISTINCT FROM OLD.founder_id
    OR NEW.investor_id IS DISTINCT FROM OLD.investor_id
    OR NEW.demo_investor_id IS DISTINCT FROM OLD.demo_investor_id
  THEN
    RAISE EXCEPTION 'connection_requests.founder_id / investor_id / demo_investor_id cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_connection_request_reassignment ON connection_requests;

CREATE TRIGGER trg_prevent_connection_request_reassignment
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_connection_request_reassignment();

-- Belt-and-suspenders: make the RLS check explicit rather than implicit/reused,
-- and put a sane bound on founder_qscore (0-100) so a bad write can't store
-- a nonsense value even though the app now always computes it server-side.
DROP POLICY IF EXISTS "Users can update relevant connection requests" ON connection_requests;

CREATE POLICY "Users can update relevant connection requests"
  ON connection_requests FOR UPDATE
  USING (auth.uid() = founder_id OR auth.uid() = investor_id)
  WITH CHECK (auth.uid() = founder_id OR auth.uid() = investor_id);

ALTER TABLE connection_requests
  DROP CONSTRAINT IF EXISTS connection_requests_founder_qscore_range;

ALTER TABLE connection_requests
  ADD CONSTRAINT connection_requests_founder_qscore_range
  CHECK (founder_qscore IS NULL OR (founder_qscore >= 0 AND founder_qscore <= 100));

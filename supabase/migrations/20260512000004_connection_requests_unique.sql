-- Prevent duplicate connection rows for the same founder+investor pair.
-- The app-layer check-then-insert has a race window; these constraints are the
-- last line of defense and enable ON CONFLICT upserts in the connections route.
-- PostgreSQL UNIQUE ignores NULL values so these two constraints are orthogonal:
-- the first fires only when demo_investor_id is set; the second only when investor_id is set.
ALTER TABLE connection_requests
  ADD CONSTRAINT uq_connection_requests_demo_pair UNIQUE (founder_id, demo_investor_id);

ALTER TABLE connection_requests
  ADD CONSTRAINT uq_connection_requests_real_pair UNIQUE (founder_id, investor_id);

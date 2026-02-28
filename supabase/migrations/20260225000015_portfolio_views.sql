-- Track when investors (or anyone) view a founder's public portfolio page.
-- Inserted via service-role client (no auth required on the public route).
-- Founders read their own analytics via RLS.

CREATE TABLE IF NOT EXISTS portfolio_views (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id  UUID        NOT NULL,
  viewer_ip   TEXT,
  referrer    TEXT,
  viewed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_views_founder_idx
  ON portfolio_views (founder_id, viewed_at DESC);

ALTER TABLE portfolio_views ENABLE ROW LEVEL SECURITY;

-- Founders can SELECT only their own rows (authenticated reads via analytics API)
CREATE POLICY "founders_read_own_views"
  ON portfolio_views FOR SELECT
  USING (auth.uid() = founder_id);

-- Service-role inserts bypass RLS, so no INSERT policy needed for the public route.
-- If you want anon inserts too, uncomment:
-- CREATE POLICY "public_insert_views"
--   ON portfolio_views FOR INSERT
--   WITH CHECK (true);

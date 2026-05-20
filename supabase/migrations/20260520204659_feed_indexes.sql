-- Performance indexes for Pulse feed queries
-- role filter + time sort (used by GET /api/feed?role=founder|investor)
CREATE INDEX IF NOT EXISTS feed_posts_role_created_idx
  ON feed_posts (role, created_at DESC);

-- post_type filter + time sort
CREATE INDEX IF NOT EXISTS feed_posts_type_created_idx
  ON feed_posts (post_type, created_at DESC);

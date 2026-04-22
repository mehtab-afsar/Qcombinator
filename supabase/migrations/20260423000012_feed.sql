-- Feed: posts + reactions for founder/investor activity stream

CREATE TABLE IF NOT EXISTS feed_posts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT        NOT NULL CHECK (role IN ('founder', 'investor')),
  post_type      TEXT        NOT NULL DEFAULT 'update'
                             CHECK (post_type IN ('milestone', 'update', 'ask', 'insight', 'auto_event')),
  body           TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  media_url      TEXT,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  likes_count    INT         NOT NULL DEFAULT 0,
  comments_count INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION sync_feed_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_feed_comments ON feed_comments;
CREATE TRIGGER trg_sync_feed_comments
  AFTER INSERT OR DELETE ON feed_comments
  FOR EACH ROW EXECUTE FUNCTION sync_feed_comments_count();

CREATE INDEX IF NOT EXISTS feed_comments_post_id_idx ON feed_comments(post_id);

CREATE TABLE IF NOT EXISTS feed_reactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction    TEXT        NOT NULL DEFAULT 'like' CHECK (reaction IN ('like')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- Denormalized count: keep likes_count in sync via trigger
CREATE OR REPLACE FUNCTION sync_feed_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_feed_likes ON feed_reactions;
CREATE TRIGGER trg_sync_feed_likes
  AFTER INSERT OR DELETE ON feed_reactions
  FOR EACH ROW EXECUTE FUNCTION sync_feed_likes_count();

-- Indexes
CREATE INDEX IF NOT EXISTS feed_posts_created_at_idx ON feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS feed_posts_user_id_idx    ON feed_posts (user_id);
CREATE INDEX IF NOT EXISTS feed_reactions_post_id_idx ON feed_reactions (post_id);

-- RLS
ALTER TABLE feed_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reactions   ENABLE ROW LEVEL SECURITY;

-- Feed posts: authenticated users can read all, insert own, delete own
CREATE POLICY "feed posts: read all"   ON feed_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed posts: insert own" ON feed_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed posts: delete own" ON feed_posts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Feed reactions: authenticated users can read all, insert own, delete own
CREATE POLICY "feed reactions: read all"   ON feed_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed reactions: insert own" ON feed_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed reactions: delete own" ON feed_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Feed comments
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed comments: read all"   ON feed_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed comments: insert own" ON feed_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed comments: delete own" ON feed_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Storage bucket for feed image attachments (created by API on first use, seeded here for migrations)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feed-media', 'feed-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "feed media: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feed-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "feed media: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'feed-media');

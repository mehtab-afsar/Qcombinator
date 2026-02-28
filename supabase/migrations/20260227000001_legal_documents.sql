-- ============================================================
-- Legal Documents — NDAs, SAFEs, and other generated docs
-- ============================================================

CREATE TABLE IF NOT EXISTS legal_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type          TEXT        NOT NULL CHECK (doc_type IN ('nda', 'safe', 'offer_letter', 'term_sheet')),
  counterparty_name TEXT,
  counterparty_email TEXT,
  content_html      TEXT,
  status            TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired')),
  sent_at           TIMESTAMPTZ,
  signed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS legal_documents_user_idx
  ON legal_documents (user_id, created_at DESC);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own legal documents"
  ON legal_documents FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

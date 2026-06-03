-- Structured agent memory columns
--
-- Replaces the single untyped key_facts TEXT blob with four purpose-specific
-- columns. This lets the memory updater and context builder handle each type
-- of fact differently (injection order, staleness, display format).
--
-- key_facts is preserved for backward compatibility and will continue to hold
-- a general prose summary. The new columns layer on top of it.

ALTER TABLE agent_memory
  ADD COLUMN IF NOT EXISTS confirmed_facts TEXT,   -- numbers/decisions the founder explicitly stated
  ADD COLUMN IF NOT EXISTS open_threads    TEXT,   -- agreed next steps / unresolved questions
  ADD COLUMN IF NOT EXISTS founder_prefs   TEXT,   -- communication style ("be concise", "skip theory")
  ADD COLUMN IF NOT EXISTS hypotheses      TEXT;   -- agent inferences, not founder-stated

-- Patel-specific: replace §PATEL_ASKED hack with a proper column
ALTER TABLE agent_memory
  ADD COLUMN IF NOT EXISTS patel_asked_questions TEXT; -- pipe-separated list of questions already asked

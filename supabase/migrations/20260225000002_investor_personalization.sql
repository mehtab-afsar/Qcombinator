-- Add AI personalization column to investor_profiles
ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS ai_personalization JSONB DEFAULT '{}';

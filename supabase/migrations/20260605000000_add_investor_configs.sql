-- Create investor_configs table
CREATE TABLE investor_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_type TEXT NOT NULL
    CHECK (investor_type IN ('angel', 'seed-vc', 'growth-vc', 'corporate')),
  preferences_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE investor_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view/edit their own config
CREATE POLICY "Users can view/edit own config"
  ON investor_configs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_investor_configs_user_id ON investor_configs(user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_investor_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_investor_configs_updated_at
  BEFORE UPDATE ON investor_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_configs_updated_at();

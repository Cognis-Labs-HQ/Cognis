ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS account_lifecycle_state VARCHAR(32) NOT NULL DEFAULT 'active';

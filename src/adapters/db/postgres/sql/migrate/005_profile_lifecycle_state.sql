ALTER TABLE account_profiles ADD COLUMN IF NOT EXISTS account_lifecycle_state TEXT NOT NULL DEFAULT 'active';

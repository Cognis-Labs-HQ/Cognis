ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS invited_by_account_id TEXT NULL REFERENCES accounts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS registration_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  inviter_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  revoked_by_account_id TEXT NULL REFERENCES accounts(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NULL,
  redeemed_account_id TEXT NULL REFERENCES accounts(id) ON DELETE SET NULL
);

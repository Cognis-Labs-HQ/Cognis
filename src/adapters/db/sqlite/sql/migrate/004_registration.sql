ALTER TABLE accounts ADD COLUMN is_founder INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN invited_by_account_id TEXT NULL REFERENCES accounts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS registration_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  inviter_account_id TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT NULL,
  revoked_by_account_id TEXT NULL,
  redeemed_at TEXT NULL,
  redeemed_account_id TEXT NULL,
  FOREIGN KEY (inviter_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (redeemed_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

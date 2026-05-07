ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS invited_by_account_id VARCHAR(191) NULL;

CREATE TABLE IF NOT EXISTS registration_tokens (
  id VARCHAR(191) PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  inviter_account_id VARCHAR(191) NOT NULL,
  invitee_email VARCHAR(320) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  revoked_by_account_id VARCHAR(191) NULL,
  redeemed_at TIMESTAMP NULL,
  redeemed_account_id VARCHAR(191) NULL,
  FOREIGN KEY (inviter_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (redeemed_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

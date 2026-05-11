CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'user',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_founder BOOLEAN NOT NULL DEFAULT FALSE,
  invited_by_account_id TEXT NULL REFERENCES accounts(id) ON DELETE SET NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_auth_credentials (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_algorithm TEXT NOT NULL DEFAULT 'sha256',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS ui_page_preferences (
  account_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  layout_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, page_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

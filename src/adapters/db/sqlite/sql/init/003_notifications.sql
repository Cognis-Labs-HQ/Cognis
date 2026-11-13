CREATE TABLE IF NOT EXISTS notification_provider_configs (
  sender_id TEXT PRIMARY KEY,
  config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  account_id TEXT NOT NULL,
  category TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  PRIMARY KEY (account_id, category, sender_id)
);

CREATE TABLE IF NOT EXISTS user_emails (
  account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, email),
  UNIQUE (email),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

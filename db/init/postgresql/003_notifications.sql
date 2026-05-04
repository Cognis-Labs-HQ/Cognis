CREATE TABLE IF NOT EXISTS notification_provider_configs (
  sender_id VARCHAR(255) PRIMARY KEY,
  config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  account_id VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (account_id, category, sender_id)
);

CREATE TABLE IF NOT EXISTS user_emails (
  account_id VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (account_id, email),
  UNIQUE (email)
);

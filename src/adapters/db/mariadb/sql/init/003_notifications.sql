CREATE TABLE IF NOT EXISTS notification_provider_configs (
  sender_id VARCHAR(191) PRIMARY KEY,
  config_json LONGTEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_notification_prefs (
  account_id VARCHAR(191) NOT NULL,
  category VARCHAR(191) NOT NULL,
  sender_id VARCHAR(191) NOT NULL,
  PRIMARY KEY (account_id, category, sender_id)
);

CREATE TABLE IF NOT EXISTS user_emails (
  account_id VARCHAR(191) NOT NULL,
  email VARCHAR(320) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, email),
  UNIQUE (email),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

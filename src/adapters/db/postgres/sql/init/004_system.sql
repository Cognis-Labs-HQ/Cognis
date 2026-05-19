CREATE TABLE IF NOT EXISTS modules (
  module_id VARCHAR(255) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bootstrap_state (
  state_key VARCHAR(255) PRIMARY KEY,
  state_value VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  pref_key VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  page_id VARCHAR(255) NOT NULL,
  layout_json TEXT NOT NULL
);

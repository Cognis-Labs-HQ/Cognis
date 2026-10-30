CREATE TABLE IF NOT EXISTS modules (
  module_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1
);


CREATE TABLE IF NOT EXISTS gateways (
  gateway_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bootstrap_state (
  state_key TEXT PRIMARY KEY,
  state_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  pref_key TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  layout_json TEXT NOT NULL
);

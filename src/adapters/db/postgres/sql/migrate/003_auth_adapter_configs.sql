CREATE TABLE IF NOT EXISTS auth_adapter_configs (
  adapter_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}'
);

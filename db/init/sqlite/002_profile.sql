CREATE TABLE IF NOT EXISTS account_profiles (
  account_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  bio TEXT,
  location TEXT,
  website TEXT,
  avatar_key TEXT,
  banner_key TEXT,
  visibility TEXT NOT NULL DEFAULT 'hidden',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'community',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS file_size_limits (
  category TEXT PRIMARY KEY,
  max_bytes INTEGER NOT NULL
);

INSERT OR IGNORE INTO file_size_limits (category, max_bytes) VALUES ('image', 5242880);
INSERT OR IGNORE INTO file_size_limits (category, max_bytes) VALUES ('video', 104857600);
INSERT OR IGNORE INTO file_size_limits (category, max_bytes) VALUES ('text', 1048576);
INSERT OR IGNORE INTO file_size_limits (category, max_bytes) VALUES ('global', 10485760);

CREATE TABLE IF NOT EXISTS direct_message_channels (
  id TEXT PRIMARY KEY,
  participant_a TEXT NOT NULL,
  participant_b TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (participant_a, participant_b),
  FOREIGN KEY (participant_a) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_b) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES direct_message_channels(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES accounts(id) ON DELETE CASCADE
);

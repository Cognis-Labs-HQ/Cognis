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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS file_size_limits (
  category TEXT PRIMARY KEY,
  max_bytes BIGINT NOT NULL
);

INSERT INTO file_size_limits (category, max_bytes) VALUES ('image', 5242880) ON CONFLICT (category) DO NOTHING;
INSERT INTO file_size_limits (category, max_bytes) VALUES ('video', 104857600) ON CONFLICT (category) DO NOTHING;
INSERT INTO file_size_limits (category, max_bytes) VALUES ('text', 1048576) ON CONFLICT (category) DO NOTHING;
INSERT INTO file_size_limits (category, max_bytes) VALUES ('global', 10485760) ON CONFLICT (category) DO NOTHING;


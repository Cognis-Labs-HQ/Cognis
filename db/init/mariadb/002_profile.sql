CREATE TABLE IF NOT EXISTS account_profiles (
  account_id VARCHAR(191) PRIMARY KEY,
  handle VARCHAR(191) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(2048),
  avatar_key VARCHAR(512),
  banner_key VARCHAR(512),
  visibility VARCHAR(32) NOT NULL DEFAULT 'hidden',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_follows (
  follower_id VARCHAR(191) NOT NULL,
  following_id VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_blocks (
  blocker_id VARCHAR(191) NOT NULL,
  blocked_id VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(191) PRIMARY KEY,
  account_id VARCHAR(191) NOT NULL,
  title VARCHAR(512),
  content LONGTEXT NOT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'community',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS file_size_limits (
  category VARCHAR(64) PRIMARY KEY,
  max_bytes BIGINT NOT NULL
);

INSERT IGNORE INTO file_size_limits (category, max_bytes) VALUES ('image', 5242880);
INSERT IGNORE INTO file_size_limits (category, max_bytes) VALUES ('video', 104857600);
INSERT IGNORE INTO file_size_limits (category, max_bytes) VALUES ('text', 1048576);
INSERT IGNORE INTO file_size_limits (category, max_bytes) VALUES ('global', 10485760);

CREATE TABLE IF NOT EXISTS direct_message_channels (
  id VARCHAR(191) PRIMARY KEY,
  participant_a VARCHAR(191) NOT NULL,
  participant_b VARCHAR(191) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dm_channel (participant_a, participant_b),
  FOREIGN KEY (participant_a) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_b) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id VARCHAR(191) PRIMARY KEY,
  channel_id VARCHAR(191) NOT NULL,
  sender_id VARCHAR(191) NOT NULL,
  content LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES direct_message_channels(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES accounts(id) ON DELETE CASCADE
);

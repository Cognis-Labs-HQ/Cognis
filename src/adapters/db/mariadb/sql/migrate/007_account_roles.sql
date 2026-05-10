ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'user';
UPDATE accounts SET role = 'admin' WHERE is_admin = TRUE AND role = 'user';

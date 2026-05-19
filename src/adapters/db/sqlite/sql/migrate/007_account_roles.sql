ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
UPDATE accounts SET role = 'admin' WHERE is_admin = 1 AND role = 'user';

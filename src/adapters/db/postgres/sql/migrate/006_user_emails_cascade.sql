ALTER TABLE user_emails DROP CONSTRAINT IF EXISTS fk_user_emails_account_id;
ALTER TABLE user_emails ADD CONSTRAINT fk_user_emails_account_id
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

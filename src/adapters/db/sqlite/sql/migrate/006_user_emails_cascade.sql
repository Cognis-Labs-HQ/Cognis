CREATE TRIGGER IF NOT EXISTS cascade_delete_user_emails
AFTER DELETE ON accounts
FOR EACH ROW
BEGIN
    DELETE FROM user_emails WHERE account_id = OLD.id;
END;

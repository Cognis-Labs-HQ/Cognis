SET @calendar_user_shares_has_expires_at = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendar_user_shares'
    AND COLUMN_NAME = 'expires_at'
);
SET @calendar_user_shares_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendar_user_shares'
);
SET @calendar_user_shares_add_expires_at_sql = IF(
  @calendar_user_shares_exists = 1 AND @calendar_user_shares_has_expires_at = 0,
  'ALTER TABLE calendar_user_shares ADD COLUMN expires_at VARCHAR(255) NOT NULL DEFAULT ''''',
  'SELECT 1'
);
PREPARE calendar_user_shares_stmt FROM @calendar_user_shares_add_expires_at_sql;
EXECUTE calendar_user_shares_stmt;
DEALLOCATE PREPARE calendar_user_shares_stmt;

import type { DatabaseGateway } from '@cognis/core';

export const MARIADB_AUTH_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) NULL,
    display_name VARCHAR(255) NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_identities (
    id VARCHAR(128) PRIMARY KEY,
    account_id VARCHAR(128) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    external_user_id VARCHAR(255) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_provider_external_user (provider, external_user_id),
    CONSTRAINT fk_auth_identities_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS local_auth_credentials (
    account_id VARCHAR(128) PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_algorithm VARCHAR(32) NOT NULL DEFAULT 'sha256',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_local_auth_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`
];

export async function ensureMariaDbAuthSchema(db: DatabaseGateway): Promise<void> {
  for (const statement of MARIADB_AUTH_SCHEMA_STATEMENTS) {
    await db.execute(statement);
  }
}

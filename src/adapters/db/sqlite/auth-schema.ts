import type { DatabaseGateway } from "@cognis/core";

export const SQLITE_AUTH_SCHEMA_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'user',
  role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
    `CREATE TABLE IF NOT EXISTS auth_identities (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    external_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(provider, external_user_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
    `CREATE TABLE IF NOT EXISTS local_auth_credentials (
    account_id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_algorithm TEXT NOT NULL DEFAULT 'sha256',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
];

export async function ensureSqliteAuthSchema(
    db: DatabaseGateway,
): Promise<void> {
    for (const statement of SQLITE_AUTH_SCHEMA_STATEMENTS) {
        await db.execute(statement);
    }
}

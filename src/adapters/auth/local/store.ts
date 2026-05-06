/**
 * DB-backed implementation of LocalAccountStore for the local auth adapter.
 *
 * This class is the sole concrete persistence layer for local user accounts.
 * It is instantiated by the auth gateway bootstrap and passed to the local
 * auth adapter. Nothing outside the auth gateway bootstrap should hold a
 * direct reference to this class.
 *
 * SQL is written inline here using placeholder helpers to support all three
 * supported dialects (SQLite, PostgreSQL, MariaDB). Schema creation is
 * handled at boot time via the SQL init scripts under
 * src/adapters/db/<provider>/sql/init/; the ensureSchema() method is a
 * no-op safety net only.
 */
import { createHash } from "node:crypto";
import type { AuthContext } from "@cognis/core";
import type { LocalAccountStore } from "../../../api/reuse/account-store.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { SupportedDbType } from "../../../gateways/db/executor.js";

function hash(input: string) {
    return createHash("sha256").update(input).digest("hex");
}

export class DbLocalAccountStore implements LocalAccountStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private placeholder(index: number) {
        if (this.dbType === "postgresql") return `$${index}`;
        return "?";
    }

    private currentTimestampExpression() {
        if (this.dbType === "postgresql") return "NOW()";
        return "CURRENT_TIMESTAMP";
    }

    async ensureSchema() {
        if (this.dbType === "postgresql") {
            await this.db.execute(`CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        email TEXT,
        display_name TEXT,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
            await this.db
                .execute(`CREATE TABLE IF NOT EXISTS local_auth_credentials (
        account_id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_algorithm TEXT NOT NULL DEFAULT 'sha256',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )`);
            return;
        }

        if (this.dbType === "mariadb") {
            await this.db.execute(`CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(191) PRIMARY KEY,
        email VARCHAR(320) NULL,
        display_name VARCHAR(255) NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`);
            await this.db
                .execute(`CREATE TABLE IF NOT EXISTS local_auth_credentials (
        account_id VARCHAR(191) PRIMARY KEY,
        username VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        password_algorithm VARCHAR(64) NOT NULL DEFAULT 'sha256',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )`);
            return;
        }

        await this.db.execute(`CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      last_login TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
        await this.db
            .execute(`CREATE TABLE IF NOT EXISTS local_auth_credentials (
      account_id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_algorithm TEXT NOT NULL DEFAULT 'sha256',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
    }

    async register(username: string, password: string, isAdmin = false) {
        if (await this.has(username)) throw new Error("username_taken");
        const role = isAdmin ? "admin" : "user";
        await this.db.execute("BEGIN");
        try {
            await this.db.execute(
                `INSERT INTO accounts (id, display_name, is_admin, created_at, updated_at)
         VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.currentTimestampExpression()}, ${this.currentTimestampExpression()})`,
                [username, username, role === "admin"],
            );
            await this.db.execute(
                `INSERT INTO local_auth_credentials (account_id, username, password_hash, password_algorithm, created_at, updated_at)
         VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)}, ${this.currentTimestampExpression()}, ${this.currentTimestampExpression()})`,
                [username, username, hash(password), "sha256"],
            );
            await this.db.execute("COMMIT");
        } catch (error) {
            await this.db.execute("ROLLBACK");
            throw error;
        }
        return { username, isAdmin, enabled: true };
    }

    async verify(
        username: string,
        password: string,
    ): Promise<AuthContext | null> {
        const result = await this.db.execute(
            `SELECT c.username, c.password_hash, a.is_admin, p.role
       FROM local_auth_credentials c
       JOIN accounts a ON a.id = c.account_id
       LEFT JOIN account_profiles p ON p.account_id = a.id
       WHERE c.username = ${this.placeholder(1)}`,
            [username],
        );
        const account = result.rows?.[0];
        if (!account || account.password_hash !== hash(password)) return null;
        const derivedRole =
            account.role ?? (Boolean(account.is_admin) ? "admin" : "user");
        return {
            accountId: username,
            provider: "local",
            externalUserId: username,
            isAdmin: Boolean(account.is_admin),
            role: derivedRole,
        };
    }

    async has(username: string) {
        const result = await this.db.execute(
            `SELECT username FROM local_auth_credentials WHERE username = ${this.placeholder(1)}`,
            [username],
        );
        return Boolean(result.rows && result.rows.length > 0);
    }

    async list() {
        const result = await this.db.execute(
            "SELECT c.username, a.is_admin FROM local_auth_credentials c JOIN accounts a ON a.id = c.account_id ORDER BY c.username",
        );
        return (result.rows ?? []).map((row) => ({
            username: row.username,
            isAdmin: Boolean(row.is_admin),
            enabled: true,
        }));
    }

    async setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ) {
        await this.db.execute(
            `UPDATE accounts SET is_admin = ${this.placeholder(1)}, updated_at = ${this.currentTimestampExpression()}
       WHERE id = (SELECT account_id FROM local_auth_credentials WHERE username = ${this.placeholder(2)})`,
            [role === "admin", username],
        );
    }
    async setPassword(username: string, password: string) {
        await this.db.execute(
            `UPDATE local_auth_credentials
       SET password_hash = ${this.placeholder(1)}, updated_at = ${this.currentTimestampExpression()}
       WHERE username = ${this.placeholder(2)}`,
            [hash(password), username],
        );
    }
    async setEnabled(username: string, enabled: boolean) {
        if (!enabled) {
            throw new Error("disable_not_supported");
        }
    }
    async delete(username: string) {
        await this.db.execute(
            `DELETE FROM accounts WHERE id = (SELECT account_id FROM local_auth_credentials WHERE username = ${this.placeholder(1)})`,
            [username],
        );
    }
    async getInfo(username: string): Promise<{
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
    } | null> {
        const result = await this.db.execute(
            `SELECT c.username, a.created_at, a.last_login FROM local_auth_credentials c
       JOIN accounts a ON a.id = c.account_id
       WHERE c.username = ${this.placeholder(1)}`,
            [username],
        );
        const row = result.rows?.[0];
        if (!row) return null;
        return {
            username: String(row.username),
            createdAt: row.created_at ? String(row.created_at) : null,
            lastLogin: row.last_login ? String(row.last_login) : null,
        };
    }

    async updateLastLogin(username: string): Promise<void> {
        await this.db.execute(
            `UPDATE accounts SET last_login = ${this.currentTimestampExpression()}, updated_at = ${this.currentTimestampExpression()}
       WHERE id = (SELECT account_id FROM local_auth_credentials WHERE username = ${this.placeholder(1)})`,
            [username],
        );
    }
}

import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { AuthContext } from "@cognis/core";
import type { LocalAccountStore } from "./local-auth-gateway.js";

export type SupportedDbType = "sqlite" | "postgresql" | "mariadb";

export interface DbExecutor {
    execute(
        sql: string,
        params?: unknown[],
    ): Promise<{ rows?: any[]; rowCount?: number }>;
}

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
function shouldLogDebug() {
    return LOG_LEVEL === "debug";
}
function logDbDebug(message: string, meta?: Record<string, unknown>) {
    if (!shouldLogDebug()) return;
    console.debug(
        JSON.stringify({
            ts: new Date().toISOString(),
            level: "debug",
            component: "db",
            message,
            ...meta,
        }),
    );
}
function logDbWarn(message: string, meta?: Record<string, unknown>) {
    console.warn(
        JSON.stringify({
            ts: new Date().toISOString(),
            level: "warn",
            component: "db",
            message,
            ...meta,
        }),
    );
}

export class SqliteExecutor implements DbExecutor {
    private dbPromise: Promise<any> | null = null;
    constructor(private readonly dbPath: string) {}

    private async getDb() {
        if (!this.dbPromise) {
            this.dbPromise = (async () => {
                const sqlite3 = await import("sqlite3").then(
                    (mod: any) => mod.default ?? mod,
                );
                await mkdir(path.dirname(this.dbPath), { recursive: true });
                return new sqlite3.Database(this.dbPath);
            })();
        }
        return this.dbPromise;
    }

    async execute(sql: string, params: unknown[] = []) {
        logDbDebug("Executing SQL statement.", {
            provider: "sqlite",
            sql,
            params,
        });
        const db = await this.getDb();
        const command = sql.trim().toLowerCase();
        if (command.startsWith("select")) {
            const rows = await new Promise<any[]>((resolve, reject) => {
                db.all(sql, params, (err: Error | null, result: any[]) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            return { rows, rowCount: rows.length };
        }

        const rowCount = await new Promise<number>((resolve, reject) => {
            db.run(
                sql,
                params,
                function (this: { changes: number }, err: Error | null) {
                    if (err) reject(err);
                    else resolve(this.changes ?? 0);
                },
            );
        });
        return { rowCount };
    }
}

export class PostgresExecutor implements DbExecutor {
    private clientPromise: Promise<any> | null = null;
    constructor(private readonly databaseUrl: string) {}
    private async getClient() {
        if (!this.clientPromise) {
            this.clientPromise = (async () => {
                const { Client } = await import("pg");
                const client = new Client({
                    connectionString: this.databaseUrl,
                });
                client.on("error", (error: Error) => {
                    logDbWarn("PostgreSQL client emitted error event.", {
                        error: error.message,
                    });
                });
                await client.connect();
                return client;
            })();
        }
        return this.clientPromise;
    }
    async execute(sql: string, params: unknown[] = []) {
        logDbDebug("Executing SQL statement.", {
            provider: "postgresql",
            sql,
            params,
        });
        const client = await this.getClient();
        try {
            const result = await client.query(sql, params);
            return { rows: result.rows, rowCount: result.rowCount };
        } catch (error) {
            logDbWarn("SQL execution failed.", {
                provider: "postgresql",
                sql,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}

export class MariadbExecutor implements DbExecutor {
    private connPromise: Promise<any> | null = null;
    constructor(private readonly databaseUrl: string) {}
    private async getConn() {
        if (!this.connPromise) {
            this.connPromise = (async () => {
                const mariadb = await import("mysql2/promise");
                return mariadb.createConnection(this.databaseUrl);
            })();
        }
        return this.connPromise;
    }
    async execute(sql: string, params: unknown[] = []) {
        logDbDebug("Executing SQL statement.", {
            provider: "mariadb",
            sql,
            params,
        });
        const conn = await this.getConn();
        try {
            const [rows] = await conn.execute(sql, params);
            if (Array.isArray(rows)) return { rows, rowCount: rows.length };
            return { rowCount: (rows as any).affectedRows ?? 0 };
        } catch (error) {
            logDbWarn("SQL execution failed.", {
                provider: "mariadb",
                sql,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}

export async function createDbExecutor(
    dbType: SupportedDbType,
): Promise<DbExecutor> {
    if (dbType === "sqlite") {
        const dbPath =
            process.env.SQLITE_PATH ??
            path.resolve(process.cwd(), "data", "cognis.sqlite");
        return new SqliteExecutor(dbPath);
    }
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error(`DATABASE_URL is required for DB_TYPE=${dbType}`);
    if (dbType === "postgresql") return new PostgresExecutor(url);
    return new MariadbExecutor(url);
}
function hash(input: string) {
    return createHash("sha256").update(input).digest("hex");
}

export class DbLocalAccountStore implements LocalAccountStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    static async create(dbType: SupportedDbType): Promise<DbLocalAccountStore> {
        const store = new DbLocalAccountStore(
            await createDbExecutor(dbType),
            dbType,
        );
        await store.ensureSchema();
        return store;
    }

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

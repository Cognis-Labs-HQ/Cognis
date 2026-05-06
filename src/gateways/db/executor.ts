/**
 * Database executor implementations for the DB gateway.
 *
 * This module is the single source of truth for all concrete executor
 * classes and the SupportedDbType union. Nothing outside the DB gateway
 * tree should import these implementations directly; callers that only
 * need the abstract interface should import DbExecutor from
 * src/gateways/db/reuse/db-executor.ts.
 *
 * The DB gateway's bootstrap selects and instantiates the right executor
 * based on the DB_TYPE environment variable. All other code obtains the
 * executor via capabilities.get('db:executor').
 *
 * Exports:
 *   SupportedDbType     — union of supported provider identifiers.
 *   SqliteExecutor      — concrete SQLite driver.
 *   PostgresExecutor    — concrete PostgreSQL driver.
 *   MariadbExecutor     — concrete MariaDB / MySQL driver.
 *   createDbExecutor    — factory that reads DB_TYPE / SQLITE_PATH /
 *                         DATABASE_URL from the environment.
 *
 * Adding a new DB provider?
 *   1. Add the type string to SupportedDbType.
 *   2. Implement DbExecutor in a new class below.
 *   3. Handle the new type in createDbExecutor().
 *   4. Add SQL init/migrate scripts under src/adapters/db/<provider>/sql/.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { DbExecutor } from "./reuse/db-executor.js";

export type { DbExecutor } from "./reuse/db-executor.js";

export type SupportedDbType = "sqlite" | "postgresql" | "mariadb";

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

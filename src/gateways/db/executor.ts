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
import type { BootstrapLog } from "@cognis/core";
import type { DbExecutor } from "./reuse/db-executor.js";

export type { DbExecutor } from "./reuse/db-executor.js";

export type SupportedDbType = "sqlite" | "postgresql" | "mariadb";

function summarizeStatement(sql: string): string {
    const statement = sql.trim().split(/\s+/, 1)[0];
    return statement ? statement.toUpperCase() : "UNKNOWN";
}

function getErrorCode(error: unknown): string | undefined {
    const code = (error as { code?: unknown })?.code;
    if (typeof code === "string" || typeof code === "number") {
        return String(code);
    }
    return undefined;
}

function buildDbErrorMeta(error: unknown): Record<string, unknown> {
    const meta: Record<string, unknown> = {
        errorName: error instanceof Error ? error.name : typeof error,
    };
    const errorCode = getErrorCode(error);
    if (errorCode) {
        meta.errorCode = errorCode;
    }
    return meta;
}

function writeDbLog(
    log: BootstrapLog | undefined,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>,
): void {
    log?.(level, message, meta);
}

export class SqliteExecutor implements DbExecutor {
    private dbPromise: Promise<any> | null = null;
    constructor(
        private readonly dbPath: string,
        private readonly log?: BootstrapLog,
    ) {}

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
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "sqlite",
            statement: summarizeStatement(sql),
            parameterCount: params.length,
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
    constructor(
        private readonly databaseUrl: string,
        private readonly log?: BootstrapLog,
    ) {}
    private async getClient() {
        if (!this.clientPromise) {
            this.clientPromise = (async () => {
                const { Client } = await import("pg");
                const client = new Client({
                    connectionString: this.databaseUrl,
                });
                client.on("error", (error: Error) => {
                    writeDbLog(
                        this.log,
                        "warn",
                        "Database client emitted error event.",
                        {
                            component: "db",
                            provider: "postgresql",
                            ...buildDbErrorMeta(error),
                        },
                    );
                });
                await client.connect();
                return client;
            })();
        }
        return this.clientPromise;
    }
    async execute(sql: string, params: unknown[] = []) {
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "postgresql",
            statement: summarizeStatement(sql),
            parameterCount: params.length,
        });
        const client = await this.getClient();
        try {
            const result = await client.query(sql, params);
            return { rows: result.rows, rowCount: result.rowCount };
        } catch (error) {
            writeDbLog(this.log, "warn", "SQL execution failed.", {
                component: "db",
                provider: "postgresql",
                statement: summarizeStatement(sql),
                parameterCount: params.length,
                ...buildDbErrorMeta(error),
            });
            throw error;
        }
    }
}

export class MariadbExecutor implements DbExecutor {
    private connPromise: Promise<any> | null = null;
    constructor(
        private readonly databaseUrl: string,
        private readonly log?: BootstrapLog,
    ) {}
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
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "mariadb",
            statement: summarizeStatement(sql),
            parameterCount: params.length,
        });
        const conn = await this.getConn();
        try {
            const [rows] = await conn.execute(sql, params);
            if (Array.isArray(rows)) return { rows, rowCount: rows.length };
            return { rowCount: (rows as any).affectedRows ?? 0 };
        } catch (error) {
            writeDbLog(this.log, "warn", "SQL execution failed.", {
                component: "db",
                provider: "mariadb",
                statement: summarizeStatement(sql),
                parameterCount: params.length,
                ...buildDbErrorMeta(error),
            });
            throw error;
        }
    }
}

export async function createDbExecutor(
    dbType: SupportedDbType,
    log?: BootstrapLog,
): Promise<DbExecutor> {
    if (dbType === "sqlite") {
        const dbPath =
            process.env.SQLITE_PATH ??
            path.resolve(process.cwd(), "data", "cognis.sqlite");
        return new SqliteExecutor(dbPath, log);
    }
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error(`DATABASE_URL is required for DB_TYPE=${dbType}`);
    if (dbType === "postgresql") return new PostgresExecutor(url, log);
    return new MariadbExecutor(url, log);
}

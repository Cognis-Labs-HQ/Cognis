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
 *   PostgresExecutor    — concrete PostgreSQL driver.
 *   MariadbExecutor     — concrete MariaDB / MySQL driver.
 *   createDbExecutor    — factory that reads DB_TYPE / DATABASE_URL
 *                         from the environment.
 *
 * Adding a new DB provider?
 *   1. Add the type string to SupportedDbType.
 *   2. Implement DbExecutor in a new class below.
 *   3. Handle the new type in createDbExecutor().
 *   4. Add SQL init/migrate scripts under src/adapters/db/<provider>/sql/.
 */
import type { BootstrapLog } from "@cognis/core";
import type { DbExecutor } from "./reuse/db-executor.js";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
    type StructuredDbDialect,
} from "./reuse/db-command.js";

export type { DbExecutor } from "./reuse/db-executor.js";

export type SupportedDbType = "postgresql" | "mariadb";

const POSTGRESQL_STRUCTURED_DB_DIALECT: StructuredDbDialect = {
    createPlaceholder(parameterIndex) {
        return `$${parameterIndex}`;
    },
    buildInsertPrefix() {
        return "INSERT INTO";
    },
    buildInsertConflictClause({
        conflict,
        conflictTarget,
        updateEntries,
        addParameter,
        hasExplicitUpdate,
    }) {
        if (conflict.action === "ignore") {
            const target =
                conflictTarget.length > 0
                    ? ` (${conflictTarget.join(", ")})`
                    : "";
            return ` ON CONFLICT${target} DO NOTHING`;
        }
        const assignments = updateEntries.map(([column, value]) =>
            hasExplicitUpdate
                ? `${column} = ${addParameter(value)}`
                : `${column} = EXCLUDED.${column}`,
        );
        return ` ON CONFLICT (${conflictTarget.join(", ")}) DO UPDATE SET ${assignments.join(", ")}`;
    },
};

const MARIADB_STRUCTURED_DB_DIALECT: StructuredDbDialect = {
    createPlaceholder() {
        return "?";
    },
    buildInsertPrefix(conflict) {
        if (conflict?.action === "ignore") {
            return "INSERT IGNORE INTO";
        }
        return "INSERT INTO";
    },
    buildInsertConflictClause({
        conflict,
        updateEntries,
        addParameter,
        hasExplicitUpdate,
    }) {
        if (conflict.action === "ignore") {
            return "";
        }
        const assignments = updateEntries.map(([column, value]) =>
            hasExplicitUpdate
                ? `${column} = ${addParameter(value)}`
                : `${column} = VALUES(${column})`,
        );
        return ` ON DUPLICATE KEY UPDATE ${assignments.join(", ")}`;
    },
};

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

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const statement = buildStructuredDbCommandStatement(
            command,
            POSTGRESQL_STRUCTURED_DB_DIALECT,
        );
        return this.execute(statement.sql, statement.params);
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

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const statement = buildStructuredDbCommandStatement(
            command,
            MARIADB_STRUCTURED_DB_DIALECT,
        );
        return this.execute(statement.sql, statement.params);
    }
}

export async function createDbExecutor(
    dbType: SupportedDbType,
    log?: BootstrapLog,
): Promise<DbExecutor> {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error(`DATABASE_URL is required for DB_TYPE=${dbType}`);
    if (dbType === "postgresql") return new PostgresExecutor(url, log);
    return new MariadbExecutor(url, log);
}

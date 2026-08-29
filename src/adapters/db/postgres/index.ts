import type { DatabaseGateway, QueryResult } from "@cognis/core";
import type { BootstrapLog } from "@cognis/core";
import type { RawDbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../../../gateways/db/reuse/provider-id.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";
import { readBoundedEnvironmentInteger } from "./settings.js";
import {
    buildDbErrorMeta,
    summarizeStatement,
    writeDbLog,
} from "../../../gateways/db/reuse/executor-log.js";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
    type StructuredDbCommandResult,
    type StructuredDbDialect,
} from "../../../gateways/db/reuse/db-command.js";

export interface PostgresQueryResult<Row = Record<string, unknown>> {
    rows: Row[];
    rowCount: number;
}

export interface PostgresClient {
    query<Row = Record<string, unknown>>(
        sql: string,
        params?: unknown[],
    ): Promise<PostgresQueryResult<Row>>;
    release(): void;
}

export interface PostgresPool {
    query<Row = Record<string, unknown>>(
        sql: string,
        params?: unknown[],
    ): Promise<PostgresQueryResult<Row>>;
    connect(): Promise<PostgresClient>;
    end(): Promise<void>;
}

export interface PostgresPoolSettings {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    statement_timeout?: number;
}

export function readPostgresPoolSettings(): PostgresPoolSettings {
    const statementTimeout = readBoundedEnvironmentInteger(
        "POSTGRES_POOL_STATEMENT_TIMEOUT_MS",
        30_000,
        0,
        3_600_000,
    );
    return {
        max: readBoundedEnvironmentInteger("POSTGRES_POOL_MAX", 10, 1, 100),
        idleTimeoutMillis: readBoundedEnvironmentInteger(
            "POSTGRES_POOL_IDLE_TIMEOUT_MS",
            30_000,
            1_000,
            600_000,
        ),
        connectionTimeoutMillis: readBoundedEnvironmentInteger(
            "POSTGRES_POOL_CONNECTION_TIMEOUT_MS",
            5_000,
            100,
            120_000,
        ),
        ...(statementTimeout > 0
            ? { statement_timeout: statementTimeout }
            : {}),
    };
}

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

export class PostgresDbGateway implements DatabaseGateway {
    constructor(
        private readonly pool: PostgresPool,
        private readonly log?: BootstrapLog,
    ) {}

    async executeCommand<Row = Record<string, unknown>>(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult<Row>> {
        const statement = buildStructuredDbCommandStatement(
            command,
            POSTGRESQL_STRUCTURED_DB_DIALECT,
        );
        const result = await this.pool.query<Row>(
            statement.sql,
            statement.params,
        );
        return { rows: result.rows, rowCount: result.rowCount };
    }

    async query<Row = Record<string, unknown>>(
        statement: string,
        params?: unknown[],
    ): Promise<QueryResult<Row>> {
        const result = await this.pool.query<Row>(statement, params);
        return { rows: result.rows, rowCount: result.rowCount };
    }

    async execute(
        statement: string,
        params?: unknown[],
    ): Promise<{ affectedRows: number }> {
        const result = await this.pool.query(statement, params);
        return { affectedRows: result.rowCount ?? 0 };
    }

    async transaction<T>(
        callback: (db: DatabaseGateway) => Promise<T>,
    ): Promise<T> {
        const client = await this.pool.connect();
        const transactionGateway = new PostgresDbGateway(
            {
                query: client.query.bind(client),
                connect: async () => client,
                end: async () => undefined,
            },
            this.log,
        );
        try {
            await client.query("BEGIN");
            const result = await callback(transactionGateway);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            writeDbLog(this.log, "error", "PostgreSQL transaction failed.", {
                component: "db",
                provider: "postgresql",
                ...buildDbErrorMeta(error),
            });
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                writeDbLog(this.log, "error", "PostgreSQL rollback failed.", {
                    component: "db",
                    provider: "postgresql",
                    ...buildDbErrorMeta(rollbackError),
                });
            }
            throw error;
        } finally {
            client.release();
        }
    }
}

class PostgresExecutor implements RawDbExecutor {
    constructor(
        private readonly pool: PostgresPool,
        private readonly log?: BootstrapLog,
    ) {}

    async execute(sql: string, params: unknown[] = []) {
        let parameterIndex = 1;
        const normalizedSql = sql.replace(/\?/g, () => `$${parameterIndex++}`);
        writeDbLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "postgresql",
            statement: summarizeStatement(normalizedSql),
            parameterCount: params.length,
        });
        try {
            const result = await this.pool.query(normalizedSql, params);
            return { rows: result.rows, rowCount: result.rowCount };
        } catch (error) {
            writeDbLog(this.log, "warn", "SQL execution failed.", {
                component: "db",
                provider: "postgresql",
                statement: summarizeStatement(normalizedSql),
                parameterCount: params.length,
                ...buildDbErrorMeta(error),
            });
            throw error;
        }
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        return new PostgresDbGateway(this.pool).executeCommand(command);
    }

    async transaction<T>(
        callback: (executor: RawDbExecutor) => Promise<T>,
    ): Promise<T> {
        const client = await this.pool.connect();
        const transactionExecutor = new PostgresExecutor(
            {
                query: client.query.bind(client),
                connect: async () => client,
                end: async () => undefined,
            },
            this.log,
        );
        try {
            await client.query("BEGIN");
            const result = await callback(transactionExecutor);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            writeDbLog(this.log, "error", "PostgreSQL transaction failed.", {
                component: "db",
                provider: "postgresql",
                ...buildDbErrorMeta(error),
            });
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                writeDbLog(this.log, "error", "PostgreSQL rollback failed.", {
                    component: "db",
                    provider: "postgresql",
                    ...buildDbErrorMeta(rollbackError),
                });
            }
            throw error;
        } finally {
            client.release();
        }
    }

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        const pgType = (
            col: StructuredDbTableDef["columns"][number],
        ): string => {
            switch (col.type) {
                case "text":
                    return "TEXT";
                case "integer":
                    return "INTEGER";
                case "bigint":
                    return "BIGINT";
                case "boolean":
                    return "BOOLEAN";
                case "timestamp":
                    return "TIMESTAMP";
                case "blob":
                    return "BYTEA";
            }
        };
        const pgDefault = (
            value: StructuredDbTableDef["columns"][number]["default"],
        ): string => {
            if (value === "now") return "CURRENT_TIMESTAMP";
            if (value === "true") return "TRUE";
            if (value === "false") return "FALSE";
            if (value === null) return "NULL";
            if (typeof value === "number") return String(value);
            return `'${String(value).replace(/'/g, "''")}'`;
        };
        const notNullFallback = (
            col: StructuredDbTableDef["columns"][number],
        ): string => {
            switch (col.type) {
                case "integer":
                case "bigint":
                    return "0";
                case "boolean":
                    return "FALSE";
                case "timestamp":
                    return "CURRENT_TIMESTAMP";
                default:
                    return "''";
            }
        };
        const compositePk = def.primaryKey ?? [];
        const columnDefs = def.columns.map((col) => {
            const parts: string[] = [`${col.name} ${pgType(col)}`];
            if (col.notNull || col.primaryKey) parts.push("NOT NULL");
            if (col.primaryKey && compositePk.length === 0)
                parts.push("PRIMARY KEY");
            if (
                col.unique &&
                !(def.uniqueKeys ?? []).some(
                    (uk) => uk.length === 1 && uk[0] === col.name,
                )
            ) {
                parts.push("UNIQUE");
            }
            if (col.default !== undefined)
                parts.push(`DEFAULT ${pgDefault(col.default)}`);
            if (col.references) {
                parts.push(
                    `REFERENCES ${col.references.table}(${col.references.column})`,
                );
                if (col.references.onDelete)
                    parts.push(`ON DELETE ${col.references.onDelete}`);
            }
            return parts.join(" ");
        });
        const tableConstraints: string[] = [];
        if (compositePk.length > 0)
            tableConstraints.push(`PRIMARY KEY (${compositePk.join(", ")})`);
        for (const uniqueKey of def.uniqueKeys ?? []) {
            tableConstraints.push(`UNIQUE (${uniqueKey.join(", ")})`);
        }
        const allDefs = [...columnDefs, ...tableConstraints];
        await this.execute(
            `CREATE TABLE IF NOT EXISTS ${def.name} (${allDefs.join(", ")})`,
        );
        const existingColsResult = await this.execute(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema()`,
            [def.name],
        );
        const existingCols = new Set(
            (existingColsResult.rows ?? []).map((row) =>
                String((row as Record<string, unknown>).column_name ?? ""),
            ),
        );
        for (const col of def.columns) {
            if (existingCols.has(col.name)) continue;
            const renamedFrom = readRenamedColumn(col);
            if (renamedFrom && existingCols.has(renamedFrom)) {
                await this.execute(
                    `ALTER TABLE ${def.name} RENAME COLUMN ${renamedFrom} TO ${col.name}`,
                );
                existingCols.add(col.name);
                continue;
            }
            const defaultClause =
                col.default !== undefined
                    ? `DEFAULT ${pgDefault(col.default)}`
                    : col.notNull
                      ? `DEFAULT ${notNullFallback(col)}`
                      : "";
            const notNullClause = col.notNull ? " NOT NULL" : "";
            const referenceClause = col.references
                ? ` REFERENCES ${col.references.table}(${col.references.column})${col.references.onDelete ? ` ON DELETE ${col.references.onDelete}` : ""}`
                : "";
            await this.execute(
                `ALTER TABLE ${def.name} ADD COLUMN IF NOT EXISTS ${col.name} ${pgType(col)}${notNullClause}${defaultClause ? ` ${defaultClause}` : ""}${referenceClause}`,
            );
        }
        for (const index of def.indexes ?? []) {
            const indexName =
                index.name ?? `idx_${def.name}_${index.columns.join("_")}`;
            await this.execute(
                `CREATE INDEX IF NOT EXISTS ${indexName} ON ${def.name} (${index.columns.join(", ")})`,
            );
        }
    }
}

function readRenamedColumn(
    column: StructuredDbTableDef["columns"][number],
): string | undefined {
    if (!("renamedFrom" in column)) return undefined;
    return typeof column.renamedFrom === "string"
        ? column.renamedFrom
        : undefined;
}

export function canHandleDbProvider(providerId: DbProviderId): boolean {
    return providerId === "postgresql";
}

export async function createDbExecutor(args: {
    databaseUrl: string;
    log?: BootstrapLog;
    lifecycle?: { registerShutdown(handler: () => Promise<void>): void };
    pool?: PostgresPool;
}): Promise<RawDbExecutor> {
    const pool =
        args.pool ?? (await createPostgresPool(args.databaseUrl, args.log));
    args.lifecycle?.registerShutdown(async () => {
        await pool.end();
        writeDbLog(args.log, "info", "PostgreSQL connection pool drained.", {
            component: "db",
            provider: "postgresql",
        });
    });
    return new PostgresExecutor(pool, args.log);
}

async function createPostgresPool(
    databaseUrl: string,
    log?: BootstrapLog,
): Promise<PostgresPool> {
    const { Pool } = await import("pg");
    const pool = new Pool({
        connectionString: databaseUrl,
        ...readPostgresPoolSettings(),
    });
    pool.on("error", (error: Error) => {
        writeDbLog(log, "error", "Idle PostgreSQL pool client failed.", {
            component: "db",
            provider: "postgresql",
            ...buildDbErrorMeta(error),
        });
    });
    return pool as PostgresPool;
}

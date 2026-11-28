import { createHash } from "node:crypto";
import type { DatabaseGateway, QueryResult } from "@cognis/core";
import type { BootstrapLog } from "@cognis/core";
import type { RawDatabaseExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { DatabaseProviderId } from "../../../gateways/db/reuse/provider-id.js";
import type { StructuredDatabaseTableDefinition } from "../../../gateways/db/reuse/db-table.js";
import { readBoundedEnvironmentInteger } from "./settings.js";
import {
    buildDatabaseErrorMetadata,
    summarizeStatement,
    writeDatabaseLog,
} from "../../../gateways/db/reuse/executor-log.js";
import {
    buildStructuredDatabaseCommandStatement,
    type StructuredDatabaseCommand,
    type StructuredDatabaseCommandResult,
    type StructuredDatabaseDialect,
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

const POSTGRESQL_STRUCTURED_DATABASE_DIALECT: StructuredDatabaseDialect = {
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

class PostgresDatabaseGateway implements DatabaseGateway {
    constructor(
        private readonly pool: PostgresPool,
        private readonly log?: BootstrapLog,
    ) {}

    async executeCommand<Row = Record<string, unknown>>(
        command: StructuredDatabaseCommand,
    ): Promise<StructuredDatabaseCommandResult<Row>> {
        const statement = buildStructuredDatabaseCommandStatement(
            command,
            POSTGRESQL_STRUCTURED_DATABASE_DIALECT,
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
        const transactionGateway = new PostgresDatabaseGateway(
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
            writeDatabaseLog(
                this.log,
                "error",
                "PostgreSQL transaction failed.",
                {
                    component: "db",
                    provider: "postgresql",
                    ...buildDatabaseErrorMetadata(error),
                },
            );
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                writeDatabaseLog(
                    this.log,
                    "error",
                    "PostgreSQL rollback failed.",
                    {
                        component: "db",
                        provider: "postgresql",
                        ...buildDatabaseErrorMetadata(rollbackError),
                    },
                );
            }
            throw error;
        } finally {
            client.release();
        }
    }
}
export { PostgresDatabaseGateway };

class PostgresExecutor implements RawDatabaseExecutor {
    constructor(
        private readonly pool: PostgresPool,
        private readonly log?: BootstrapLog,
        private readonly inTransaction = false,
    ) {}

    async execute(sql: string, params: unknown[] = []) {
        let parameterIndex = 1;
        const normalizedSql = sql.replace(/\?/g, () => `$${parameterIndex++}`);
        writeDatabaseLog(this.log, "debug", "Executing SQL statement.", {
            component: "db",
            provider: "postgresql",
            statement: summarizeStatement(normalizedSql),
            parameterCount: params.length,
        });
        try {
            const result = await this.pool.query(normalizedSql, params);
            return { rows: result.rows, rowCount: result.rowCount };
        } catch (error) {
            writeDatabaseLog(this.log, "warn", "SQL execution failed.", {
                component: "db",
                provider: "postgresql",
                statement: summarizeStatement(normalizedSql),
                parameterCount: params.length,
                ...buildDatabaseErrorMetadata(error),
            });
            throw error;
        }
    }

    async executeCommand(
        command: StructuredDatabaseCommand,
    ): Promise<StructuredDatabaseCommandResult> {
        return new PostgresDatabaseGateway(this.pool).executeCommand(command);
    }

    async transaction<T>(
        callback: (executor: RawDatabaseExecutor) => Promise<T>,
    ): Promise<T> {
        const client = await this.pool.connect();
        const transactionExecutor = new PostgresExecutor(
            {
                query: client.query.bind(client),
                connect: async () => client,
                end: async () => undefined,
            },
            this.log,
            true,
        );
        try {
            await client.query("BEGIN");
            const result = await callback(transactionExecutor);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            writeDatabaseLog(
                this.log,
                "error",
                "PostgreSQL transaction failed.",
                {
                    component: "db",
                    provider: "postgresql",
                    ...buildDatabaseErrorMetadata(error),
                },
            );
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                writeDatabaseLog(
                    this.log,
                    "error",
                    "PostgreSQL rollback failed.",
                    {
                        component: "db",
                        provider: "postgresql",
                        ...buildDatabaseErrorMetadata(rollbackError),
                    },
                );
            }
            throw error;
        } finally {
            client.release();
        }
    }

    async ensureTable(
        definition: StructuredDatabaseTableDefinition,
    ): Promise<void> {
        if (!this.inTransaction) {
            await this.transaction((executor) =>
                executor.ensureTable(definition),
            );
            return;
        }
        // Serialize schema initialization even before the table exists.
        await this.execute(
            "SELECT pg_advisory_xact_lock(hashtext(current_database() || ':' || current_schema()), hashtext($1))",
            [definition.name],
        );
        await this.reconcileTable(definition);
    }

    private async reconcileTable(
        definition: StructuredDatabaseTableDefinition,
    ): Promise<void> {
        const pgType = (
            column: StructuredDatabaseTableDefinition["columns"][number],
        ): string => {
            switch (column.type) {
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
            value: StructuredDatabaseTableDefinition["columns"][number]["default"],
        ): string => {
            if (value === "now") return "CURRENT_TIMESTAMP";
            if (value === "true") return "TRUE";
            if (value === "false") return "FALSE";
            if (value === null) return "NULL";
            if (typeof value === "number") return String(value);
            return `'${String(value).replace(/'/g, "''")}'`;
        };
        const notNullFallback = (
            column: StructuredDatabaseTableDefinition["columns"][number],
        ): string => {
            switch (column.type) {
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
        const compositePrimaryKey = definition.primaryKey ?? [];
        const columnDefinitions = definition.columns.map((column) => {
            const parts: string[] = [`${column.name} ${pgType(column)}`];
            if (column.notNull || column.primaryKey) parts.push("NOT NULL");
            if (column.primaryKey && compositePrimaryKey.length === 0)
                parts.push("PRIMARY KEY");
            if (
                column.unique &&
                !(definition.uniqueKeys ?? []).some(
                    (uniqueKey) =>
                        uniqueKey.length === 1 && uniqueKey[0] === column.name,
                )
            ) {
                parts.push("UNIQUE");
            }
            if (column.default !== undefined)
                parts.push(`DEFAULT ${pgDefault(column.default)}`);
            if (column.references) {
                parts.push(
                    `REFERENCES ${column.references.table}(${column.references.column})`,
                );
                if (column.references.onDelete)
                    parts.push(`ON DELETE ${column.references.onDelete}`);
            }
            return parts.join(" ");
        });
        const tableConstraints: string[] = [];
        if (compositePrimaryKey.length > 0)
            tableConstraints.push(
                `PRIMARY KEY (${compositePrimaryKey.join(", ")})`,
            );
        for (const uniqueKey of definition.uniqueKeys ?? []) {
            tableConstraints.push(`UNIQUE (${uniqueKey.join(", ")})`);
        }
        const allDefinitions = [...columnDefinitions, ...tableConstraints];
        await this.execute(
            `CREATE TABLE IF NOT EXISTS ${definition.name} (${allDefinitions.join(", ")})`,
        );
        const existingColumnsResult = await this.execute(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema()`,
            [definition.name],
        );
        const existingColumns = new Set(
            (existingColumnsResult.rows ?? []).map((row) =>
                String((row as Record<string, unknown>).column_name ?? ""),
            ),
        );
        for (const column of definition.columns) {
            if (existingColumns.has(column.name)) continue;
            const renamedFrom = readRenamedColumn(column);
            if (renamedFrom && existingColumns.has(renamedFrom)) {
                await this.execute(
                    `ALTER TABLE ${definition.name} RENAME COLUMN ${renamedFrom} TO ${column.name}`,
                );
                existingColumns.add(column.name);
                continue;
            }
            const defaultClause =
                column.default !== undefined
                    ? `DEFAULT ${pgDefault(column.default)}`
                    : column.notNull
                      ? `DEFAULT ${notNullFallback(column)}`
                      : "";
            const notNullClause = column.notNull ? " NOT NULL" : "";
            const referenceClause = column.references
                ? ` REFERENCES ${column.references.table}(${column.references.column})${column.references.onDelete ? ` ON DELETE ${column.references.onDelete}` : ""}`
                : "";
            await this.execute(
                `ALTER TABLE ${definition.name} ADD COLUMN IF NOT EXISTS ${column.name} ${pgType(column)}${notNullClause}${defaultClause ? ` ${defaultClause}` : ""}${referenceClause}`,
            );
        }
        await this.ensureUniqueKeys(definition);
        for (const index of definition.indexes ?? []) {
            const indexName =
                index.name ??
                `idx_${definition.name}_${index.columns.join("_")}`;
            await this.execute(
                `CREATE INDEX IF NOT EXISTS ${indexName} ON ${definition.name} (${index.columns.join(", ")})`,
            );
        }
    }

    private async ensureUniqueKeys(
        definition: StructuredDatabaseTableDefinition,
    ): Promise<void> {
        const declaredKeys = [
            ...definition.columns
                .filter((column) => column.unique)
                .map((column) => [column.name]),
            ...(definition.uniqueKeys ?? []),
        ];
        if (!declaredKeys.length) return;
        const result = await this.execute(
            `SELECT ARRAY(
                SELECT pg_attribute.attname::text
                FROM unnest(pg_index.indkey) WITH ORDINALITY AS index_columns(attnum, position)
                JOIN pg_attribute ON pg_attribute.attrelid = pg_index.indrelid
                    AND pg_attribute.attnum = index_columns.attnum
                WHERE index_columns.position <= pg_index.indnkeyatts
                ORDER BY pg_attribute.attname
            ) AS columns
            FROM pg_index
            WHERE pg_index.indrelid = to_regclass($1)
                AND pg_index.indisunique AND pg_index.indisvalid
                AND pg_index.indisready AND pg_index.indimmediate
                AND pg_index.indpred IS NULL AND pg_index.indexprs IS NULL`,
            [definition.name],
        );
        const existingKeys = new Set(
            (result.rows ?? []).map((row) =>
                JSON.stringify([...row.columns].sort()),
            ),
        );
        for (const columns of declaredKeys) {
            const key = JSON.stringify([...new Set(columns)].sort());
            if (existingKeys.has(key)) continue;
            const digest = createHash("sha256")
                .update(JSON.stringify([definition.name, key]))
                .digest("hex")
                .slice(0, 40);
            // Do not ignore a colliding name: only a verified index satisfies the contract.
            await this.execute(
                `CREATE UNIQUE INDEX cognis_unique_${digest} ON ${definition.name} (${columns.join(", ")})`,
            );
            existingKeys.add(key);
            writeDatabaseLog(
                this.log,
                "info",
                "PostgreSQL unique key reconciled.",
                {
                    component: "db",
                    provider: "postgresql",
                    table: definition.name,
                    columns,
                },
            );
        }
    }
}

function readRenamedColumn(
    column: StructuredDatabaseTableDefinition["columns"][number],
): string | undefined {
    if (!("renamedFrom" in column)) return undefined;
    return typeof column.renamedFrom === "string"
        ? column.renamedFrom
        : undefined;
}

function canHandleDatabaseProvider(providerId: DatabaseProviderId): boolean {
    return providerId === "postgresql";
}
export { canHandleDatabaseProvider };

async function createDatabaseExecutor(args: {
    databaseUrl: string;
    log?: BootstrapLog;
    lifecycle?: { registerShutdown(handler: () => Promise<void>): void };
    pool?: PostgresPool;
}): Promise<RawDatabaseExecutor> {
    const pool =
        args.pool ?? (await createPostgresPool(args.databaseUrl, args.log));
    args.lifecycle?.registerShutdown(async () => {
        await pool.end();
        writeDatabaseLog(
            args.log,
            "info",
            "PostgreSQL connection pool drained.",
            {
                component: "db",
                provider: "postgresql",
            },
        );
    });
    return new PostgresExecutor(pool, args.log);
}
export { createDatabaseExecutor };

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
        writeDatabaseLog(log, "error", "Idle PostgreSQL pool client failed.", {
            component: "db",
            provider: "postgresql",
            ...buildDatabaseErrorMetadata(error),
        });
    });
    return pool as PostgresPool;
}
